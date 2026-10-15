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
        denyTransactionMock.mockResolvedValue({httpStatusCode: 200, reason: REASON.FLOW_OUTCOMES.TRANSACTION_DENIED, message: undefined});

        await onCancel({transactionID: TRANSACTION_ID}, {isScenarioActionSent: false});

        expect(denyTransactionMock).toHaveBeenCalledTimes(1);
        expect(denyTransactionMock).toHaveBeenCalledWith({transactionID: TRANSACTION_ID});
    });

    it('returns the deny result, so a successful deny shows the transaction-denied screen', async () => {
        denyTransactionMock.mockResolvedValue({httpStatusCode: 200, reason: REASON.FLOW_OUTCOMES.TRANSACTION_DENIED, message: undefined});

        const error = await onCancel({transactionID: TRANSACTION_ID}, {isScenarioActionSent: false});

        expect(error).toEqual(createMFAErrorFromApiResponse(200, REASON.FLOW_OUTCOMES.TRANSACTION_DENIED, undefined));
    });

    it('falls back to CANCELED when the deny response carries no reason', async () => {
        denyTransactionMock.mockResolvedValue({httpStatusCode: 500, reason: undefined, message: 'Server error'});

        const error = await onCancel({transactionID: TRANSACTION_ID}, {isScenarioActionSent: false});

        expect(error.reason).toBe(REASON.LOCAL_ERRORS.CANCELED);
    });

    describe('when the deny arrives after the transaction was approved', () => {
        beforeEach(() => {
            denyTransactionMock.mockResolvedValue({httpStatusCode: 400, reason: REASON.CLIENT_ERRORS.ALREADY_APPROVED_DENY_ATTEMPTED, message: 'Transaction already approved'});
        });

        it('reports the approval when this flow already sent its approve', async () => {
            const error = await onCancel({transactionID: TRANSACTION_ID}, {isScenarioActionSent: true});

            expect(error).toEqual(createMFAErrorFromApiResponse(400, REASON.FLOW_OUTCOMES.TRANSACTION_APPROVED, 'Transaction already approved'));
        });

        it('shows the transaction-approved screen for that reason', () => {
            expect(failureScreens[REASON.FLOW_OUTCOMES.TRANSACTION_APPROVED].type).toBe(successScreen.type);
        });

        it('keeps the already-reviewed reason when the approve came from elsewhere', async () => {
            const error = await onCancel({transactionID: TRANSACTION_ID}, {isScenarioActionSent: false});

            expect(error.reason).toBe(REASON.CLIENT_ERRORS.ALREADY_APPROVED_DENY_ATTEMPTED);
        });
    });

    it.each([true, false])('returns a successful deny unchanged when isScenarioActionSent is %s', async (isScenarioActionSent) => {
        denyTransactionMock.mockResolvedValue({httpStatusCode: 200, reason: REASON.FLOW_OUTCOMES.TRANSACTION_DENIED, message: undefined});

        const error = await onCancel({transactionID: TRANSACTION_ID}, {isScenarioActionSent});

        expect(error.reason).toBe(REASON.FLOW_OUTCOMES.TRANSACTION_DENIED);
    });

    it('returns CANCELED without denying when the payload has no transaction', async () => {
        const error = await onCancel(undefined, {isScenarioActionSent: false});

        expect(denyTransactionMock).not.toHaveBeenCalled();
        expect(error).toEqual(createLocalMFAError(REASON.LOCAL_ERRORS.CANCELED, undefined));
    });
});
