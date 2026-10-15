import {authorizeTransaction, denyTransaction, requestRegistrationChallenge} from '@libs/actions/MultifactorAuthentication';
import {makeRequestWithSideEffects} from '@libs/API';
import {SIDE_EFFECT_REQUEST_COMMANDS} from '@libs/API/types';
import Log from '@libs/Log';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';
import {MFA_TEST_AUTH_METHOD, MFA_TEST_SIGNED_CHALLENGE} from 'tests/utils/mfa/flowFixtures';

jest.mock('@libs/API');

const mockMakeRequestWithSideEffects = jest.mocked(makeRequestWithSideEffects);
const VALIDATE_CODE = '123456';

describe('actions/MultifactorAuthentication', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockMakeRequestWithSideEffects.mockResolvedValue(undefined);
    });

    it('marks the validate-code form as loading while requesting a registration challenge', async () => {
        await requestRegistrationChallenge(VALIDATE_CODE);

        expect(mockMakeRequestWithSideEffects).toHaveBeenCalledWith(
            SIDE_EFFECT_REQUEST_COMMANDS.REQUEST_AUTHENTICATION_CHALLENGE,
            {
                challengeType: 'registration',
                validateCode: VALIDATE_CODE,
            },
            expect.objectContaining({
                optimisticData: expect.arrayContaining([
                    {
                        key: ONYXKEYS.ACCOUNT,
                        onyxMethod: Onyx.METHOD.MERGE,
                        value: {
                            isLoading: true,
                            loadingForm: CONST.FORMS.VALIDATE_CODE_FORM,
                        },
                    },
                ]),
                finallyData: expect.arrayContaining([
                    {
                        key: ONYXKEYS.ACCOUNT,
                        onyxMethod: Onyx.METHOD.MERGE,
                        value: {
                            isLoading: false,
                            loadingForm: undefined,
                        },
                    },
                ]),
            }),
        );
    });

    describe('transaction review timing', () => {
        const TRANSACTION_ID = 'txn-timing';
        const REVIEW_LOG = '[MFA] Transaction review request completed';
        const REASON = CONST.MULTIFACTOR_AUTHENTICATION.REASON;
        let logInfoSpy: jest.SpyInstance;

        function approve() {
            return authorizeTransaction({
                transactionID: TRANSACTION_ID,
                signedChallenge: MFA_TEST_SIGNED_CHALLENGE,
                authenticationMethod: MFA_TEST_AUTH_METHOD.marqetaValue,
            });
        }

        function getReviewLogs() {
            return logInfoSpy.mock.calls.filter(([message]) => message === REVIEW_LOG).map(([, , parameters]) => parameters as unknown);
        }

        beforeEach(() => {
            logInfoSpy = jest.spyOn(Log, 'info').mockImplementation(() => {});
        });

        afterEach(() => {
            logInfoSpy.mockRestore();
            jest.restoreAllMocks();
        });

        it.each([
            ['approve', approve, SIDE_EFFECT_REQUEST_COMMANDS.AUTHORIZE_TRANSACTION, {jsonCode: 200}, undefined],
            ['deny', () => denyTransaction({transactionID: TRANSACTION_ID}), SIDE_EFFECT_REQUEST_COMMANDS.DENY_TRANSACTION, {jsonCode: 200}, REASON.FLOW_OUTCOMES.TRANSACTION_DENIED],
        ])('logs how long the %s took once it responds', async (_, sendReview, command, response, reason) => {
            jest.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(1250);
            mockMakeRequestWithSideEffects.mockResolvedValue(response);

            await sendReview();

            expect(getReviewLogs()).toEqual([{mfa: {command, transactionID: TRANSACTION_ID, durationMs: 250, completedAt: 1250, httpStatusCode: 200, reason}}]);
        });

        it('logs the failed request too', async () => {
            jest.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(4000);
            mockMakeRequestWithSideEffects.mockRejectedValue(new Error('Network down'));

            await denyTransaction({transactionID: TRANSACTION_ID});

            expect(getReviewLogs()).toEqual([
                {
                    mfa: {
                        command: SIDE_EFFECT_REQUEST_COMMANDS.DENY_TRANSACTION,
                        transactionID: TRANSACTION_ID,
                        durationMs: 3000,
                        completedAt: 4000,
                        httpStatusCode: 0,
                        reason: REASON.LOCAL_ERRORS.UNHANDLED_API_RESPONSE,
                    },
                },
            ]);
        });

        it('logs the approve when it responds after the deny', async () => {
            let respondToApprove: (response: {jsonCode: number}) => void = () => {};
            mockMakeRequestWithSideEffects
                .mockImplementationOnce(
                    () =>
                        new Promise((resolve) => {
                            respondToApprove = resolve;
                        }),
                )
                .mockResolvedValueOnce({jsonCode: 200});

            const approveRequest = approve();
            await denyTransaction({transactionID: TRANSACTION_ID});
            respondToApprove({jsonCode: 200});
            await approveRequest;

            expect(getReviewLogs()).toEqual([
                {mfa: expect.objectContaining({command: SIDE_EFFECT_REQUEST_COMMANDS.DENY_TRANSACTION})},
                {mfa: expect.objectContaining({command: SIDE_EFFECT_REQUEST_COMMANDS.AUTHORIZE_TRANSACTION})},
            ]);
        });
    });
});
