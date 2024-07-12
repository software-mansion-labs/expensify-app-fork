import Onyx from 'react-native-onyx';
import type {OnyxUpdate} from 'react-native-onyx';
import * as API from '@libs/API';
import type {SearchParams} from '@libs/API/parameters';
import {READ_COMMANDS, WRITE_COMMANDS} from '@libs/API/types';
import * as ApiUtils from '@libs/ApiUtils';
import fileDownload from '@libs/fileDownload';
import enhanceParameters from '@libs/Network/enhanceParameters';
import ONYXKEYS from '@src/ONYXKEYS';
import type {SearchTransaction} from '@src/types/onyx/SearchResults';
import * as Report from './Report';

let currentUserEmail: string;
Onyx.connect({
    key: ONYXKEYS.SESSION,
    callback: (val) => {
        currentUserEmail = val?.email ?? '';
    },
});

function getOnyxLoadingData(hash: number): {optimisticData: OnyxUpdate[]; finallyData: OnyxUpdate[]} {
    const optimisticData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.SNAPSHOT}${hash}`,
            value: {
                search: {
                    isLoading: true,
                },
            },
        },
    ];

    const finallyData: OnyxUpdate[] = [
        {
            onyxMethod: Onyx.METHOD.MERGE,
            key: `${ONYXKEYS.COLLECTION.SNAPSHOT}${hash}`,
            value: {
                search: {
                    isLoading: false,
                },
            },
        },
    ];

    return {optimisticData, finallyData};
}

function search({hash, query, policyIDs, offset, sortBy, sortOrder}: SearchParams) {
    const {optimisticData, finallyData} = getOnyxLoadingData(hash);

    API.read(READ_COMMANDS.SEARCH, {hash, query, offset, policyIDs, sortBy, sortOrder}, {optimisticData, finallyData});
}

/**
 * It's possible that we return legacy transactions that don't have a transaction thread created yet.
 * In that case, when users select the search result row, we need to create the transaction thread on the fly and update the search result with the new transactionThreadReport
 */
function createTransactionThread(hash: number, transactionID: string, reportID: string, moneyRequestReportActionID: string) {
    Report.openReport(reportID, '', [currentUserEmail], undefined, moneyRequestReportActionID);

    const onyxUpdate: Record<string, Record<string, Partial<SearchTransaction>>> = {
        data: {
            [`${ONYXKEYS.COLLECTION.TRANSACTION}${transactionID}`]: {
                transactionThreadReportID: reportID,
            },
        },
    };
    Onyx.merge(`${ONYXKEYS.COLLECTION.SNAPSHOT}${hash}`, onyxUpdate);
}

function holdMoneyRequestOnSearch(hash: number, transactionIDList: string[], comment: string) {
    const {optimisticData, finallyData} = getOnyxLoadingData(hash);

    API.write(WRITE_COMMANDS.HOLD_MONEY_REQUEST_ON_SEARCH, {hash, transactionIDList, comment}, {optimisticData, finallyData});
}

function unholdMoneyRequestOnSearch(hash: number, transactionIDList: string[]) {
    const {optimisticData, finallyData} = getOnyxLoadingData(hash);

    API.write(WRITE_COMMANDS.UNHOLD_MONEY_REQUEST_ON_SEARCH, {hash, transactionIDList}, {optimisticData, finallyData});
}

function deleteMoneyRequestOnSearch(hash: number, transactionIDList: string[]) {
    const {optimisticData, finallyData} = getOnyxLoadingData(hash);
    API.write(WRITE_COMMANDS.DELETE_MONEY_REQUEST_ON_SEARCH, {hash, transactionIDList}, {optimisticData, finallyData});
}
type Params = Record<string, string | string[] | number | boolean>;

function convertArrayToCommaSeparatedString(value: string[]): string {
    return value.join(',');
}

function convertObjectToFormData(obj: Params): FormData {
    const formData = new FormData();

    Object.entries(obj).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            formData.append(key, convertArrayToCommaSeparatedString(value)); // Convert the array to a comma-separated string
        } else {
            formData.append(key, String(value));
        }
    });

    return formData;
}

function exportSearchItemsToCSV(query: string, reportIDList: string[], transactionIDList: string[], policyIDs: string[]) {
    const fileName = `Expensify_${query}.csv`;
    const params: Params = {
        query,
        reportIDList,
        transactionIDList,
        policyIDs,
    };

    // Assuming enhanceParameters modifies the params object
    const finalParameters = enhanceParameters(READ_COMMANDS.EXPORT_SEARCH_ITEMS_TO_CSV, params) as Params;

    // Convert final parameters to FormData
    const formData = convertObjectToFormData(finalParameters);

    fileDownload(ApiUtils.getCommandURL({command: READ_COMMANDS.EXPORT_SEARCH_ITEMS_TO_CSV}), fileName, '', false, formData, 'post');
}
export {search, createTransactionThread, deleteMoneyRequestOnSearch, holdMoneyRequestOnSearch, unholdMoneyRequestOnSearch, exportSearchItemsToCSV};
