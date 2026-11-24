import {getIsOffline} from '@libs/NetworkState';

import {clearAccountErrorMirror, clearRequestState, getRequestKey, retainRequestKey, runRequest} from '@pages/SimplifiedBankOnboarding/core/requests/runRequest';
import type {RequestOutcome} from '@pages/SimplifiedBankOnboarding/core/requests/types';
import {READ_COMMANDS, WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {read, write} from '@pages/SimplifiedBankOnboarding/mockBackend/mockApi';

import ONYXKEYS from '@src/ONYXKEYS';
import type {OnyxData} from '@src/types/onyx/Request';

import type {OnyxKey} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

import getOnyxValue from '../../utils/getOnyxValue';
import waitForBatchedUpdates from '../../utils/waitForBatchedUpdates';

jest.mock('@pages/SimplifiedBankOnboarding/mockBackend/mockApi', () => ({
    read: jest.fn(),
    write: jest.fn(),
}));
jest.mock('@libs/NetworkState', () => ({
    ...jest.requireActual<Record<string, unknown>>('@libs/NetworkState'),
    getIsOffline: jest.fn(() => false),
}));

type Answer = 'success' | 'failure' | 'adminRequired' | 'none';

const VALIDATE_NAME = 'lab.verifyAccount.validate';
const OTHER_ERROR = {otherRequest: 'An error of another request'};

/** Applies the data of a request the way the mock API does for each kind of answer. An answer that needs an admin applies neither the success nor the failure data. */
function answerRequests(answer: Answer) {
    const applyAnswer = (_command: string, _params: unknown, onyxData: OnyxData<OnyxKey> = {}) => {
        Onyx.update(onyxData.optimisticData ?? [])
            .then(() => {
                if (answer === 'success') {
                    return Onyx.update(onyxData.successData ?? []);
                }
                return answer === 'failure' ? Onyx.update(onyxData.failureData ?? []) : undefined;
            })
            .then(() => (answer === 'none' ? undefined : Onyx.update(onyxData.finallyData ?? [])));
    };
    jest.mocked(write).mockImplementation(applyAnswer);
    jest.mocked(read).mockImplementation(applyAnswer);
}

function sendValidateUser(shouldShowErrorOutsideFlow = false): Promise<RequestOutcome> {
    return runRequest({
        name: VALIDATE_NAME,
        type: 'write',
        command: WRITE_COMMANDS.VALIDATE_USER,
        params: {validateCode: '123456'},
        shouldShowErrorOutsideFlow,
    });
}

async function getRequestState() {
    const requests = await getOnyxValue(ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS);
    return requests?.[getRequestKey(VALIDATE_NAME)];
}

describe('runRequest', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.mocked(getIsOffline).mockReturnValue(false);
        jest.mocked(read).mockReset();
        jest.mocked(write).mockReset();
        await clearRequestState();
        await Onyx.clear();
        await waitForBatchedUpdates();
    });

    afterAll(() => clearRequestState());

    it('builds the request key from the name and the bank account scope', () => {
        // Given one request name used for a workspace, for a bank account opened without a workspace, and with no scope
        // When the keys are built
        // Then the workspace wins over the bank account, so a request of one bank account never shows on another one
        expect(
            getRequestKey('usd.personalInfo.confirm', {
                policyID: '1',
                bankAccountID: 2,
            }),
        ).toBe('usd.personalInfo.confirm:policy-1');
        expect(getRequestKey('usd.personalInfo.confirm', {bankAccountID: 2})).toBe('usd.personalInfo.confirm:bankAccount-2');
        expect(getRequestKey('usd.personalInfo.confirm')).toBe('usd.personalInfo.confirm');
    });

    it('settles as succeeded when the answer applies the success data', async () => {
        // Given a server that accepts the request
        answerRequests('success');

        // When the request is sent
        const outcome = await sendValidateUser();

        // Then the handler that awaits it goes on, and the page shows no pending state
        expect(outcome).toEqual({status: 'succeeded'});
        expect((await getRequestState())?.status).toBe('succeeded');
    });

    it('keeps the error of a failed request while a component uses its key', async () => {
        // Given a mounted page that uses the request, and a server that rejects it
        const release = retainRequestKey(getRequestKey(VALIDATE_NAME));
        answerRequests('failure');

        // When the request is sent
        const outcome = await sendValidateUser();
        await waitForBatchedUpdates();

        // Then the handler stays on the page, which shows the error of the request
        expect(outcome).toEqual({status: 'failed'});
        expect((await getRequestState())?.errors).toBeTruthy();
        release();
    });

    it('settles as failed when the answer applies neither the success nor the failure data', async () => {
        // Given a mounted page and an answer that applies only the finally data
        const release = retainRequestKey(getRequestKey(VALIDATE_NAME));
        answerRequests('adminRequired');

        // When the request is sent
        const outcome = await sendValidateUser();
        await waitForBatchedUpdates();

        // Then the request does not stay pending forever: the page shows an error instead of a loader
        expect(outcome).toEqual({status: 'failed'});
        expect((await getRequestState())?.status).toBe('failed');
        release();
    });

    it('sends nothing and writes nothing for a read made offline', async () => {
        // Given the app is offline
        jest.mocked(getIsOffline).mockReturnValue(true);
        answerRequests('success');

        // When a read that raises account.isLoading is sent
        const outcome = await runRequest({
            name: 'lab.landing.open',
            type: 'read',
            command: READ_COMMANDS.OPEN_LANDING_PAGE,
            params: {},
            onyxData: {
                optimisticData: [
                    {
                        onyxMethod: Onyx.METHOD.MERGE,
                        key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT,
                        value: {isLoading: true},
                    },
                ],
            },
        });
        await waitForBatchedUpdates();

        // Then the read is skipped, so no loader waits for an answer that never comes
        expect(outcome).toEqual({status: 'skipped'});
        expect(read).not.toHaveBeenCalled();
        expect(await getOnyxValue(ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS)).toBeUndefined();
        expect(await getOnyxValue(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT)).toBeUndefined();
    });

    it('clears every status and settles the pending requests as skipped when called without a name', async () => {
        // Given an answered request and a request that has no answer yet
        answerRequests('success');
        await runRequest({
            name: 'lab.landing.open',
            type: 'read',
            command: READ_COMMANDS.OPEN_LANDING_PAGE,
            params: {},
        });
        answerRequests('none');
        const pendingOutcome = sendValidateUser();
        await waitForBatchedUpdates();

        // When the lab is reset
        await clearRequestState();

        // Then no page shows an old state, and the handler that waited for the pending request returns
        expect(await pendingOutcome).toEqual({status: 'skipped'});
        expect(await getOnyxValue(ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS)).toBeUndefined();
    });

    it('clears one status when called with a name', async () => {
        // Given two answered requests
        answerRequests('success');
        await sendValidateUser();
        await runRequest({
            name: 'lab.landing.open',
            type: 'read',
            command: READ_COMMANDS.OPEN_LANDING_PAGE,
            params: {},
        });

        // When the status of one of them is cleared
        await clearRequestState(VALIDATE_NAME);

        // Then only that status is gone
        expect(await getRequestState()).toBeUndefined();
        expect((await getOnyxValue(ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS))?.[getRequestKey('lab.landing.open')]?.status).toBe('succeeded');
    });

    it('clears the page error and the account error mirror of a failure that arrives with no mounted user', async () => {
        // Given a request that mirrors its error to the account, and a page that unmounted before the answer
        const release = retainRequestKey(getRequestKey(VALIDATE_NAME));
        answerRequests('failure');
        const outcome = sendValidateUser(true);
        release();

        // When the failure arrives
        expect(await outcome).toEqual({status: 'failed'});
        await waitForBatchedUpdates();

        // Then neither the page nor the entry and Payments pages show an error of a page that is gone
        expect(await getRequestState()).toBeUndefined();
        expect((await getOnyxValue(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT))?.errors).toBeFalsy();
    });

    it('clears the mirrored error of a failed request on a Back press and keeps the page error', async () => {
        // Given a failed request of a mounted page, with its error mirrored to the account
        const release = retainRequestKey(getRequestKey(VALIDATE_NAME));
        answerRequests('failure');
        await sendValidateUser(true);
        await waitForBatchedUpdates();
        expect((await getOnyxValue(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT))?.errors).toBeTruthy();

        // When the step shell clears the mirror for a Back press
        await clearAccountErrorMirror();
        await waitForBatchedUpdates();

        // Then the entry and Payments pages show no error, while the page that failed keeps its own
        expect((await getOnyxValue(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT))?.errors).toBeFalsy();
        expect((await getRequestState())?.status).toBe('failed');
        release();
    });

    it('keeps an account error of another request when the failed page unmounts', async () => {
        // Given a failed request with a mirrored error, and a newer error of another request on the account
        const release = retainRequestKey(getRequestKey(VALIDATE_NAME));
        answerRequests('failure');
        await sendValidateUser(true);
        await waitForBatchedUpdates();
        await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {
            errors: OTHER_ERROR,
        });

        // When the page that sent the failed request unmounts
        release();
        await waitForBatchedUpdates();

        // Then its own page error is gone, but the error of the other request stays
        expect(await getRequestState()).toBeUndefined();
        expect((await getOnyxValue(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT))?.errors).toEqual(OTHER_ERROR);
    });
});
