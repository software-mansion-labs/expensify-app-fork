import {makeRequestWithSideEffects} from '@libs/API';
import HttpsError from '@libs/Errors/HttpsError';
import {getIsOffline, subscribe} from '@libs/NetworkState';

import {denyTransaction, fireAndForgetDenyTransaction} from '@userActions/MultifactorAuthentication';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';
import waitForBatchedUpdates from 'tests/utils/waitForBatchedUpdates';

jest.mock('@libs/API');
jest.mock('@libs/NetworkState', () => ({
    ...jest.requireActual<Record<string, unknown>>('@libs/NetworkState'),
    getIsOffline: jest.fn(() => false),
    subscribe: jest.fn(() => () => {}),
}));

const REASON = CONST.MULTIFACTOR_AUTHENTICATION.REASON;
const TRANSACTION_ID = 'txn-deny';
const LOST = new TypeError(CONST.ERROR.FAILED_TO_FETCH);
const DENIED = {jsonCode: 200, message: undefined};

const makeRequestMock = jest.mocked(makeRequestWithSideEffects);
const mergeSpy = jest.spyOn(Onyx, 'merge');

/** Whether the local "decided on this device" flag for the transaction was dropped. */
function wasLocalDecisionForgotten() {
    return mergeSpy.mock.calls.some(([key, value]) => key === ONYXKEYS.LOCALLY_PROCESSED_3DS_TRANSACTION_REVIEWS && JSON.stringify(value) === JSON.stringify({[TRANSACTION_ID]: null}));
}

describe('denyTransaction', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(getIsOffline).mockReturnValue(false);
    });

    it('sends the deny once when it gets an answer', async () => {
        makeRequestMock.mockResolvedValueOnce(DENIED);

        const result = await denyTransaction({transactionID: TRANSACTION_ID});

        expect(makeRequestMock).toHaveBeenCalledTimes(1);
        expect(result.reason).toBe(REASON.FLOW_OUTCOMES.TRANSACTION_DENIED);
    });

    it('does not re-send a deny the server answered with an error', async () => {
        makeRequestMock.mockRejectedValueOnce(
            new HttpsError({message: CONST.ERROR.EXPENSIFY_SERVICE_INTERRUPTED, status: String(CONST.HTTP_STATUS.INTERNAL_SERVER_ERROR), title: 'Issue connecting to Expensify site'}),
        );

        const result = await denyTransaction({transactionID: TRANSACTION_ID});

        expect(makeRequestMock).toHaveBeenCalledTimes(1);
        expect(result.reason).toBe(REASON.SERVER_ERRORS.UNRECOGNIZED);
    });

    it('re-sends a deny whose answer was lost and returns the second answer', async () => {
        // Given the first deny's answer is lost and the second one arrives
        makeRequestMock.mockRejectedValueOnce(LOST).mockResolvedValueOnce(DENIED);

        // When the user denies
        const result = await denyTransaction({transactionID: TRANSACTION_ID});

        // Then the deny goes out twice and the flow sees the answer, keeping the local decision
        expect(makeRequestMock).toHaveBeenCalledTimes(2);
        expect(result.reason).toBe(REASON.FLOW_OUTCOMES.TRANSACTION_DENIED);
        expect(wasLocalDecisionForgotten()).toBe(false);
    });

    it('waits for the network before re-sending', async () => {
        // Given the device is offline when the deny's answer is lost
        let notifyNetworkChange: (() => void) | undefined;
        jest.mocked(subscribe).mockImplementationOnce((callback) => {
            notifyNetworkChange = callback;
            return () => {};
        });
        jest.mocked(getIsOffline).mockReturnValue(true);
        makeRequestMock.mockRejectedValueOnce(LOST).mockResolvedValueOnce(DENIED);

        const resultPromise = denyTransaction({transactionID: TRANSACTION_ID});
        await waitForBatchedUpdates();

        // Then nothing is re-sent while offline
        expect(makeRequestMock).toHaveBeenCalledTimes(1);

        // When the device is back online
        jest.mocked(getIsOffline).mockReturnValue(false);
        notifyNetworkChange?.();

        // Then the deny goes out again
        const result = await resultPromise;
        expect(makeRequestMock).toHaveBeenCalledTimes(2);
        expect(result.reason).toBe(REASON.FLOW_OUTCOMES.TRANSACTION_DENIED);
    });

    it('forgets the local decision when the re-sent deny is lost too', async () => {
        // Given both denies lose their answer
        makeRequestMock.mockRejectedValueOnce(LOST).mockRejectedValueOnce(LOST);

        // When the user denies
        const result = await denyTransaction({transactionID: TRANSACTION_ID});

        // Then the flow sees a lost answer, and the Review can come back while the transaction is still pending
        expect(makeRequestMock).toHaveBeenCalledTimes(2);
        expect(result.reason).toBe(REASON.LOCAL_ERRORS.NO_RESPONSE);
        expect(wasLocalDecisionForgotten()).toBe(true);
    });
});

describe('fireAndForgetDenyTransaction', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('forgets the local decision when the deny is lost', async () => {
        makeRequestMock.mockRejectedValueOnce(LOST);

        fireAndForgetDenyTransaction({transactionID: TRANSACTION_ID});
        await waitForBatchedUpdates();

        expect(makeRequestMock).toHaveBeenCalledTimes(1);
        expect(wasLocalDecisionForgotten()).toBe(true);
    });

    it.each([
        {description: 'the deny is answered', settle: () => makeRequestMock.mockResolvedValueOnce(DENIED)},
        {description: 'the deny fails with an unexpected error', settle: () => makeRequestMock.mockRejectedValueOnce(new Error('Unexpected'))},
    ])('keeps the local decision when $description', async ({settle}) => {
        settle();

        fireAndForgetDenyTransaction({transactionID: TRANSACTION_ID});
        await waitForBatchedUpdates();

        expect(wasLocalDecisionForgotten()).toBe(false);
    });
});
