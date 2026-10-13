import {getIsOffline} from '@libs/NetworkState';
import {getCombinedReportActions, getOneTransactionThreadReportID, getSortedReportActions, withDEWRoutedActionsArray} from '@libs/ReportActionsUtils';

import createOnyxDerivedValueConfig from '@userActions/OnyxDerived/createOnyxDerivedValueConfig';
import {getMemberIDs} from '@userActions/OnyxDerived/utils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Report, ReportAction, ReportActions} from '@src/types/onyx';
import type {SortedReportActionsDerivedValue} from '@src/types/onyx/DerivedValues';

import type {OnyxCollection} from 'react-native-onyx';

const EMPTY_VALUE: SortedReportActionsDerivedValue = {sortedActions: {}, lastActions: {}, transactionThreadIDs: {}};

function computeForReport(
    reportID: string,
    actions: ReportActions,
    allReportActions: OnyxCollection<ReportActions>,
    allReports: OnyxCollection<Report>,
    isOffline: boolean,
): {sortedReportActions: ReportAction[]; transactionThreadReportID: string | undefined; lastAction: ReportAction | undefined} {
    const reportActionsArray = Object.values(actions);
    let sortedReportActions = getSortedReportActions(withDEWRoutedActionsArray(reportActionsArray), true);

    const report = allReports?.[`${ONYXKEYS.COLLECTION.REPORT}${reportID}`];
    const chatReport = allReports?.[`${ONYXKEYS.COLLECTION.REPORT}${report?.chatReportID}`];

    const transactionThreadReportID = getOneTransactionThreadReportID(report, chatReport, actions, isOffline);

    if (transactionThreadReportID && allReportActions) {
        const transactionThreadReportActionsArray = Object.values(allReportActions[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${transactionThreadReportID}`] ?? {});
        const isSelfDM = report?.chatType === CONST.REPORT.CHAT_TYPE.SELF_DM;
        sortedReportActions = getCombinedReportActions(sortedReportActions, transactionThreadReportID, transactionThreadReportActionsArray, isSelfDM);
    }

    return {
        sortedReportActions,
        transactionThreadReportID,
        lastAction: sortedReportActions.at(0),
    };
}

/**
 * Get the reports whose entry a flush can change: the reports whose actions or report changed, the reports that combine
 * a changed report's actions as their transaction thread, and the reports of a changed chat, which can be a send money flow.
 */
function getReportIDsToRecompute(
    reportActionsUpdates: OnyxCollection<ReportActions>,
    reportUpdates: OnyxCollection<Report>,
    allReports: OnyxCollection<Report>,
    transactionThreadIDs: SortedReportActionsDerivedValue['transactionThreadIDs'],
): Set<string> {
    const reportIDsWithChangedActions = new Set(getMemberIDs(ONYXKEYS.COLLECTION.REPORT_ACTIONS, reportActionsUpdates));
    const changedReportIDs = new Set(getMemberIDs(ONYXKEYS.COLLECTION.REPORT, reportUpdates));
    const reportIDs = new Set([...reportIDsWithChangedActions, ...changedReportIDs]);

    for (const [reportID, transactionThreadReportID] of Object.entries(transactionThreadIDs)) {
        if (transactionThreadReportID && reportIDsWithChangedActions.has(transactionThreadReportID)) {
            reportIDs.add(reportID);
        }
    }
    if (changedReportIDs.size > 0) {
        for (const report of Object.values(allReports ?? {})) {
            if (report?.reportID && report.chatReportID && changedReportIDs.has(report.chatReportID)) {
                reportIDs.add(report.reportID);
            }
        }
    }
    return reportIDs;
}

export default createOnyxDerivedValueConfig({
    key: ONYXKEYS.DERIVED.RAM_ONLY_SORTED_REPORT_ACTIONS,
    dependencies: [ONYXKEYS.COLLECTION.REPORT_ACTIONS, ONYXKEYS.COLLECTION.REPORT, ONYXKEYS.NETWORK],
    // Every change copies the three maps and replaces the changed report's entries.
    skipNullRemoval: true,
    compute: ([allReportActions, allReports], {sourceValues, currentValue, triggeredKeys}): SortedReportActionsDerivedValue => {
        if (!allReportActions) {
            return EMPTY_VALUE;
        }

        // Read the in-memory offline state directly (NETWORK is a dependency so recompute still fires when it changes).
        const isOffline = getIsOffline();

        // Incremental update: only recompute the reports a report or report action change can affect. A NETWORK
        // change flips isOffline for every report, so it takes the full recompute below. NETWORK is checked via
        // triggeredKeys, as coalescing can batch it with the other changes in a single flush.
        if (sourceValues && currentValue && !triggeredKeys?.has(ONYXKEYS.NETWORK)) {
            const sortedActions = {...currentValue.sortedActions};
            const lastActions = {...currentValue.lastActions};
            const transactionThreadIDs = {...currentValue.transactionThreadIDs};
            const reportIDs = getReportIDsToRecompute(
                sourceValues[ONYXKEYS.COLLECTION.REPORT_ACTIONS],
                sourceValues[ONYXKEYS.COLLECTION.REPORT],
                allReports,
                currentValue.transactionThreadIDs,
            );

            for (const reportID of reportIDs) {
                if (!reportID) {
                    continue;
                }

                const actions = allReportActions[`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${reportID}`];
                if (!actions) {
                    delete sortedActions[reportID];
                    delete lastActions[reportID];
                    delete transactionThreadIDs[reportID];
                    continue;
                }

                const result = computeForReport(reportID, actions, allReportActions, allReports, isOffline);
                sortedActions[reportID] = result.sortedReportActions;
                if (result.transactionThreadReportID) {
                    transactionThreadIDs[reportID] = result.transactionThreadReportID;
                } else {
                    delete transactionThreadIDs[reportID];
                }
                if (result.lastAction) {
                    lastActions[reportID] = result.lastAction;
                } else {
                    delete lastActions[reportID];
                }
            }

            return {sortedActions, lastActions, transactionThreadIDs};
        }

        // Full recompute on first load or when the network state changes
        const sortedActions: SortedReportActionsDerivedValue['sortedActions'] = {};
        const lastActions: SortedReportActionsDerivedValue['lastActions'] = {};
        const transactionThreadIDs: SortedReportActionsDerivedValue['transactionThreadIDs'] = {};

        for (const key of Object.keys(allReportActions)) {
            const actions = allReportActions[key];
            if (!actions) {
                continue;
            }

            const reportID = key.replace(ONYXKEYS.COLLECTION.REPORT_ACTIONS, '');
            if (!reportID) {
                continue;
            }

            const result = computeForReport(reportID, actions, allReportActions, allReports, isOffline);
            sortedActions[reportID] = result.sortedReportActions;
            if (result.transactionThreadReportID) {
                transactionThreadIDs[reportID] = result.transactionThreadReportID;
            }
            if (result.lastAction) {
                lastActions[reportID] = result.lastAction;
            } else {
                delete lastActions[reportID];
            }
        }

        return {sortedActions, lastActions, transactionThreadIDs};
    },
});

export {computeForReport};
