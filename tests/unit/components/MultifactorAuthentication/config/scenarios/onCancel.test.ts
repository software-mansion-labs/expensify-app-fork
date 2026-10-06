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
const {onCancel} = getScenarioConfig(CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO.AUTHORIZE_TRANSACTION);

describe('AuthorizeTransaction onCancel', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('denies the transaction from the payload', async () => {
        denyTransactionMock.mockResolvedValue({httpStatusCode: 200, reason: REASON.FLOW_OUTCOMES.TRANSACTION_DENIED, message: undefined});

        await onCancel({transactionID: TRANSACTION_ID});

        expect(denyTransactionMock).toHaveBeenCalledTimes(1);
        expect(denyTransactionMock).toHaveBeenCalledWith({transactionID: TRANSACTION_ID});
    });

    it('returns the deny result, so a successful deny shows the transaction-denied screen', async () => {
        denyTransactionMock.mockResolvedValue({httpStatusCode: 200, reason: REASON.FLOW_OUTCOMES.TRANSACTION_DENIED, message: undefined});

        const error = await onCancel({transactionID: TRANSACTION_ID});

        expect(error).toEqual(createMFAErrorFromApiResponse(200, REASON.FLOW_OUTCOMES.TRANSACTION_DENIED, undefined));
    });

    it('falls back to CANCELED when the deny response carries no reason', async () => {
        denyTransactionMock.mockResolvedValue({httpStatusCode: 500, reason: undefined, message: 'Server error'});

        const error = await onCancel({transactionID: TRANSACTION_ID});

        expect(error.reason).toBe(REASON.LOCAL_ERRORS.CANCELED);
    });

    it('returns CANCELED without denying when the payload has no transaction', async () => {
        const error = await onCancel(undefined);

        expect(denyTransactionMock).not.toHaveBeenCalled();
        expect(error).toEqual(createLocalMFAError(REASON.LOCAL_ERRORS.CANCELED, undefined));
    });
});
