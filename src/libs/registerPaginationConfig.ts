import ONYXKEYS from '@src/ONYXKEYS';
import type {Report, ReportNameValuePairs} from '@src/types/onyx';

import type {OnyxEntry, OnyxKey} from 'react-native-onyx';

import OnyxUtils from 'react-native-onyx/dist/OnyxUtils';

import {READ_COMMANDS, WRITE_COMMANDS} from './API/types';
import {registerPaginationConfig} from './Middleware/Pagination';
import {getSortedReportActionsForDisplay} from './ReportActionsUtils';
import {canUserPerformWriteAction as canUserPerformWriteActionReportUtils} from './ReportUtils';

// Module-level cast helper: `tryGetCachedValue` returns the untyped OnyxValue union, and a generic
// assertion at the call site would be repeated per key — narrow the boundary once here.
function getCachedEntry<TValue>(key: OnyxKey): OnyxEntry<TValue> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the cache delivers this key's value
    return OnyxUtils.tryGetCachedValue(key) as OnyxEntry<TValue>;
}

registerPaginationConfig({
    initialCommand: WRITE_COMMANDS.OPEN_REPORT,
    previousCommand: READ_COMMANDS.GET_OLDER_ACTIONS,
    nextCommand: READ_COMMANDS.GET_NEWER_ACTIONS,
    resourceCollectionKey: ONYXKEYS.COLLECTION.REPORT_ACTIONS,
    pageCollectionKey: ONYXKEYS.COLLECTION.REPORT_ACTIONS_PAGES,
    sortItems: (reportActions, reportID) => {
        // Lazy-Onyx POC: keyed warm-cache reads instead of two whole-collection subscriptions
        // (REPORT + REPORT_NAME_VALUE_PAIRS) held open just to look up ONE member each per call.
        // The report is warm by construction — the paginated response that triggers sortItems has
        // just written it. The RNVP entry may be cold on the very first call, which matches the old
        // behavior of the module connect before its first flush (allReportNameValuePairs undefined).
        const report = getCachedEntry<Report>(`${ONYXKEYS.COLLECTION.REPORT}${reportID}`);
        const reportNameValuePairs = getCachedEntry<ReportNameValuePairs>(`${ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS}${reportID}`);
        const isReportArchived = !!reportNameValuePairs?.private_isArchived;
        const canUserPerformWriteAction = canUserPerformWriteActionReportUtils(report, isReportArchived);
        return getSortedReportActionsForDisplay(reportActions, canUserPerformWriteAction, true, undefined, reportID);
    },
    getItemID: (reportAction) => reportAction.reportActionID,
});
