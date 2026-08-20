import {act, renderHook} from '@testing-library/react-native';

import Onyx from 'react-native-onyx';

import useReportTransactionsCollection from '../../src/hooks/useReportTransactionsCollection';
import ONYXKEYS from '../../src/ONYXKEYS';
import createRandomTransaction from '../utils/collections/transaction';
import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

describe('useReportTransactionsCollection', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
        return waitForBatchedUpdates();
    });

    beforeEach(() => {
        Onyx.clear();
        return waitForBatchedUpdates();
    });

    it('returns transactions for the requested report ID', async () => {
        const reportID = '1';
        const transaction = {...createRandomTransaction(1), reportID};

        // Lazy-Onyx: the hook queries the transactions collection by reportID instead of reading a derived value.
        await Onyx.merge(`${ONYXKEYS.COLLECTION.TRANSACTION}${transaction.transactionID}`, transaction);

        const {result} = renderHook(() => useReportTransactionsCollection(reportID));
        await act(async () => waitForBatchedUpdates());

        expect(result.current).toEqual({[`${ONYXKEYS.COLLECTION.TRANSACTION}${transaction.transactionID}`]: transaction});
    });

    it('returns an empty object when reportID is missing', async () => {
        const transaction = {...createRandomTransaction(1), reportID: '1'};
        await Onyx.merge(`${ONYXKEYS.COLLECTION.TRANSACTION}${transaction.transactionID}`, transaction);

        const {result} = renderHook(() => useReportTransactionsCollection());
        await act(async () => waitForBatchedUpdates());

        expect(result.current).toEqual({});
    });

    it('returns an empty object when report does not have transactions', async () => {
        const transaction = {...createRandomTransaction(1), reportID: '1'};
        await Onyx.merge(`${ONYXKEYS.COLLECTION.TRANSACTION}${transaction.transactionID}`, transaction);

        const {result} = renderHook(() => useReportTransactionsCollection('999'));
        await act(async () => waitForBatchedUpdates());

        expect(result.current).toEqual({});
    });
});
