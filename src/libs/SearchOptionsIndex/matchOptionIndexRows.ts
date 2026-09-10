import {optionsOrderBy} from '@libs/OptionsListUtils';
import type {OptionIndexRow} from '@libs/SqlEngine/wasm/protocol';

import type {SearchCandidateIDs} from './types';

function rowOrderKey(row: OptionIndexRow): string {
    return row.orderKey;
}

/**
 * The JS counterfactual of the worker query: the same rows, scanned on the main thread with the router's own
 * heap. Reports keep the most recent matches, contacts the alphabetically first ones.
 */
function matchOptionIndexRows(rows: OptionIndexRow[], terms: string[], reportLimit: number, contactLimit: number): SearchCandidateIDs {
    const matches = (kind: OptionIndexRow['kind']) => (row: OptionIndexRow) => row.kind === kind && !row.isHidden && terms.every((term) => row.searchText.includes(term));
    const reports = optionsOrderBy(rows, rowOrderKey, reportLimit, matches('report'));
    const contacts = optionsOrderBy(rows, rowOrderKey, contactLimit, matches('contact'), true);
    return {
        reportIDs: reports.options.map((row) => row.id),
        accountIDs: contacts.options.map((row) => row.id),
        hasMoreReports: reports.hasMore,
        hasMoreContacts: contacts.hasMore,
    };
}

export default matchOptionIndexRows;
