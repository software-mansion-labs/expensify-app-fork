import {getScenarioConfig} from '@components/MultifactorAuthentication/config';

import {createLocalMFAError, createMFAErrorFromApiResponse} from '@libs/MultifactorAuthentication/shared/MFAResult';

import {denyTransaction} from '@userActions/MultifactorAuthentication';

import CONST from '@src/CONST';

jest.mock('@userActions/MultifactorAuthentication', () => ({
    ...jest.requireActual<Record<string, unknown>>('@userActions/MultifactorAuthentication'),
    denyTransaction: jest.fn(),
}));

const REASON = CONST.MULTIFACTOR_AUTHENTICATION.REASON;
const TRANSACTION_ID = 'txn-cancel';

const denyTransactionMock = jest.mocked(denyTransaction);
const {onCancel, failureScreens, successScreen} = getScenarioConfig(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.AUTHORIZE_TRANSACTION);

describe('AuthorizeTransaction onCancel', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('denies the transaction from the payload', async () => {
        // Given the backend accepts the deny, so the test only checks which transaction gets denied
        denyTransactionMock.mockResolvedValue({httpStatusCode: 200, reason: REASON.FLOW_OUTCOMES.TRANSACTION_DENIED, message: undefined});

        // When the user cancels the authorize-transaction flow
        await onCancel({transactionID: TRANSACTION_ID}, {isScenarioActionSent: false});

        // Then exactly the transaction under review is denied once, because cancelling a 3DS challenge must decline that payment
        expect(denyTransactionMock).toHaveBeenCalledTimes(1);
        expect(denyTransactionMock).toHaveBeenCalledWith({transactionID: TRANSACTION_ID});
    });

    it('returns the deny result, so a successful deny shows the transaction-denied screen', async () => {
        // Given the backend confirms the transaction was denied
        denyTransactionMock.mockResolvedValue({httpStatusCode: 200, reason: REASON.FLOW_OUTCOMES.TRANSACTION_DENIED, message: undefined});

        // When the user cancels the flow
        const error = await onCancel({transactionID: TRANSACTION_ID}, {isScenarioActionSent: false});

        // Then the deny response is passed through, because its reason is what picks the transaction-denied outcome screen
        expect(error).toEqual(createMFAErrorFromApiResponse(200, REASON.FLOW_OUTCOMES.TRANSACTION_DENIED, undefined));
    });

    it('falls back to CANCELED when the deny response carries no reason', async () => {
        // Given the deny request fails without a reason the outcome screens could map
        denyTransactionMock.mockResolvedValue({httpStatusCode: 500, reason: undefined, message: 'Server error'});

        // When the user cancels the flow
        const error = await onCancel({transactionID: TRANSACTION_ID}, {isScenarioActionSent: false});

        // Then the outcome is a plain cancel, so the user still lands on a known screen instead of an unmapped error
        expect(error.reason).toBe(REASON.LOCAL_ERRORS.CANCELED);
    });

    describe('when the deny arrives after the transaction was approved', () => {
        beforeEach(() => {
            // Given the backend rejects the deny because the transaction was already approved
            denyTransactionMock.mockResolvedValue({httpStatusCode: 400, reason: REASON.CLIENT_ERRORS.ALREADY_APPROVED_DENY_ATTEMPTED, message: 'Transaction already approved'});
        });

        it('reports the approval when this flow already sent its approve', async () => {
            // When the user cancels after this flow had already sent its approve request
            const error = await onCancel({transactionID: TRANSACTION_ID}, {isScenarioActionSent: true});

            // Then the outcome is reported as approved, because the approval came from this very flow and the user should see it succeeded
            expect(error).toEqual(createMFAErrorFromApiResponse(400, REASON.FLOW_OUTCOMES.TRANSACTION_APPROVED, 'Transaction already approved'));
        });

        it('shows the transaction-approved screen for that reason', () => {
            // Given the scenario config for the approved-during-cancel reason
            // When the outcome screen for that reason is looked up
            // Then it is the success screen, because the transaction really was approved despite the cancel
            expect(failureScreens[REASON.FLOW_OUTCOMES.TRANSACTION_APPROVED].type).toBe(successScreen.type);
        });

        it('keeps the already-reviewed reason when the approve came from elsewhere', async () => {
            // When the user cancels without this flow having sent an approve
            const error = await onCancel({transactionID: TRANSACTION_ID}, {isScenarioActionSent: false});

            // Then the already-reviewed reason is kept, because the approval happened somewhere else and must not be claimed as this flow's success
            expect(error.reason).toBe(REASON.CLIENT_ERRORS.ALREADY_APPROVED_DENY_ATTEMPTED);
        });
    });

    it.each([true, false])('returns a successful deny unchanged when isScenarioActionSent is %s', async (isScenarioActionSent) => {
        // Given the backend confirms the deny
        denyTransactionMock.mockResolvedValue({httpStatusCode: 200, reason: REASON.FLOW_OUTCOMES.TRANSACTION_DENIED, message: undefined});

        // When the user cancels, whether or not the approve request was already sent
        const error = await onCancel({transactionID: TRANSACTION_ID}, {isScenarioActionSent});

        // Then the denied reason is kept, because only an already-approved rejection should be reinterpreted
        expect(error.reason).toBe(REASON.FLOW_OUTCOMES.TRANSACTION_DENIED);
    });

    it('returns CANCELED without denying when the payload has no transaction', async () => {
        // Given a flow whose payload carries no transaction to deny
        // When the user cancels it
        const error = await onCancel(undefined, {isScenarioActionSent: false});

        // Then nothing is denied and the outcome is a plain cancel, because there is no transaction the backend could decline
        expect(denyTransactionMock).not.toHaveBeenCalled();
        expect(error).toEqual(createLocalMFAError(REASON.LOCAL_ERRORS.CANCELED, undefined));
    });
});
