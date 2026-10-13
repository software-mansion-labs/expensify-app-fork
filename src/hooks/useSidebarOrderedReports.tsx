import {setInboxTab} from '@libs/actions/User';
import getLinkedReportKeys from '@libs/getLinkedReportKeys';
import getReportAttributesUpdates from '@libs/getReportAttributesUpdates';
import getInboxTabSummary from '@libs/LHNOrderIndex/getInboxTabSummary';
import getReportIDsForInboxTab from '@libs/LHNOrderIndex/getReportIDsForInboxTab';
import LHNOrderIndex from '@libs/LHNOrderIndex/LHNOrderIndex';
import Log from '@libs/Log';
import SidebarUtils from '@libs/SidebarUtils';
import type {BrickRoad} from '@libs/WorkspacesSettingsUtils';
import {getChatTabBrickRoad} from '@libs/WorkspacesSettingsUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type * as OnyxTypes from '@src/types/onyx';

import type {ValueOf} from 'type-fest';

import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';

import useCollectionDelta from './useCollectionDelta';
import {useCurrentReportIDState} from './useCurrentReportID';
import useCurrentUserPersonalDetails from './useCurrentUserPersonalDetails';
import useLocalize from './useLocalize';
import useNetwork from './useNetwork';
import useOnyx from './useOnyx';
import usePermissions from './usePermissions';
import usePrevious from './usePrevious';
import useReportAttributes from './useReportAttributes';

type SidebarOrderedReportsContextProviderProps = {
    children: React.ReactNode;
    currentReportIDForTests?: string;
};

type SidebarOrderedReportsStateContextValue = {
    /** The reports rendered in the LHN for the active Inbox tab (a filtered subset of orderedReportIDs). */
    filteredReports: OnyxTypes.Report[];
    /** All ordered LHN report IDs, unfiltered by the active Inbox tab. Used for total counts (e.g. focus-mode switch) and brick road. */
    orderedReportIDs: string[];
    currentReportID: string | undefined;
    chatTabBrickRoad: BrickRoad;
    activeTab: ValueOf<typeof CONST.INBOX_TAB>;
    inboxTabCounts: Record<typeof CONST.INBOX_TAB.TODO | typeof CONST.INBOX_TAB.UNREAD, number>;
    /** Whether the Unread tab holds a report whose newest message is older than CONST.INBOX_TAB_STALE_UNREAD_MONTHS. */
    hasStaleUnreadReport: boolean;
};

type SidebarOrderedReportsActionsContextValue = {
    clearLHNCache: () => void;
    setActiveTab: (tab: ValueOf<typeof CONST.INBOX_TAB>) => void;
    setStickyReportID: (reportID: string) => void;
    /** The report IDs listed under the given Inbox tab, read on demand by bulk tab actions (e.g. "Mark all as read"). */
    getReportIDsForTab: (tab: ValueOf<typeof CONST.INBOX_TAB>) => string[];
};

type ReportsToDisplayInLHN = Record<
    string,
    OnyxTypes.Report & {
        hasErrorsOtherThanFailedReceipt?: boolean;
        requiresAttention?: boolean;
        isUnreadReport?: boolean;
    }
>;

const SidebarOrderedReportsStateContext = createContext<SidebarOrderedReportsStateContextValue>({
    filteredReports: [],
    orderedReportIDs: [],
    currentReportID: '',
    chatTabBrickRoad: undefined,
    activeTab: CONST.INBOX_TAB.ALL,
    inboxTabCounts: {
        [CONST.INBOX_TAB.TODO]: 0,
        [CONST.INBOX_TAB.UNREAD]: 0,
    },
    hasStaleUnreadReport: false,
});

const SidebarOrderedReportsActionsContext = createContext<SidebarOrderedReportsActionsContextValue>({
    clearLHNCache: () => {},
    setActiveTab: () => {},
    setStickyReportID: () => {},
    getReportIDsForTab: () => [],
});

// This file does not compile with React Compiler (the reportsToDisplayInLHN memo below leaves out dependencies on
// purpose), so the manual useMemo/useCallback in this provider are load-bearing and must stay.
function SidebarOrderedReportsContextProvider({
    children,
    /**
     * Only required to make unit tests work, since we
     * explicitly pass the currentReportID in LHNTestUtils
     * to SidebarLinksData, so this context doesn't have
     * access to currentReportID in that case.
     *
     * This is a workaround to have currentReportID available in testing environment.
     */
    currentReportIDForTests,
}: SidebarOrderedReportsContextProviderProps) {
    const {localeCompare} = useLocalize();
    const [priorityMode = CONST.PRIORITY_MODE.DEFAULT] = useOnyx(ONYXKEYS.NVP_PRIORITY_MODE);
    const [inboxTab = CONST.INBOX_TAB.ALL] = useOnyx(ONYXKEYS.NVP_INBOX_TAB);
    const activeTab = inboxTab ?? CONST.INBOX_TAB.ALL;
    const [chatReports] = useOnyx(ONYXKEYS.COLLECTION.REPORT);
    const reportUpdates = useCollectionDelta(chatReports);
    const [allPolicies] = useOnyx(ONYXKEYS.COLLECTION.POLICY);
    const policiesUpdates = useCollectionDelta(allPolicies);
    const [transactions] = useOnyx(ONYXKEYS.COLLECTION.TRANSACTION);
    const transactionsUpdates = useCollectionDelta(transactions);
    const [transactionViolations] = useOnyx(ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS);
    const transactionViolationsUpdates = useCollectionDelta(transactionViolations);
    const [reportNameValuePairs] = useOnyx(ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS);
    const reportNameValuePairsUpdates = useCollectionDelta(reportNameValuePairs);
    const [reportActions] = useOnyx(ONYXKEYS.COLLECTION.REPORT_ACTIONS);
    const reportActionsUpdates = useCollectionDelta(reportActions);
    const [reportsDrafts] = useOnyx(ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT);
    const reportsDraftsUpdates = useCollectionDelta(reportsDrafts);
    const {isBetaEnabled} = usePermissions();
    const isDefaultRoomsBetaEnabled = isBetaEnabled(CONST.BETAS.DEFAULT_ROOMS);
    // useOnyx only gives us a new reference when the guide set actually differs, so comparing references
    // below is enough to detect late guide hydration.
    const [guideAccountIDs] = useOnyx(ONYXKEYS.DERIVED.GUIDE_ACCOUNT_IDS);
    const prevGuideAccountIDs = usePrevious(guideAccountIDs);
    const [conciergeReportID] = useOnyx(ONYXKEYS.CONCIERGE_REPORT_ID);
    const reportAttributes = useReportAttributes();
    const prevReportAttributes = usePrevious(reportAttributes);
    const reportAttributesUpdates = useMemo(() => getReportAttributesUpdates(reportAttributes, prevReportAttributes), [reportAttributes, prevReportAttributes]);
    const [currentReportsToDisplay, setCurrentReportsToDisplay] = useState<ReportsToDisplayInLHN>({});
    const {isOffline} = useNetwork();
    const {accountID, login: currentUserLogin} = useCurrentUserPersonalDetails();
    const {currentReportID: currentReportIDValue} = useCurrentReportIDState();
    const derivedCurrentReportID = currentReportIDForTests ?? currentReportIDValue;
    const prevDerivedCurrentReportID = usePrevious(derivedCurrentReportID);

    // we need to force reportsToDisplayInLHN to re-compute when we clear currentReportsToDisplay, but the way it currently works relies on not having currentReportsToDisplay as a memo dependency, so we just need something we can change to trigger it
    // I don't like it either, but clearing the cache is only a hack for the debug modal and I will endeavor to make it better as I work to improve the cache correctness of the LHN more broadly
    const [clearCacheDummyCounter, setClearCacheDummyCounter] = useState(0);

    const prevIsDefaultRoomsBetaEnabled = usePrevious(isDefaultRoomsBetaEnabled);
    const prevPriorityMode = usePrevious(priorityMode);
    const prevIsOffline = usePrevious(isOffline);
    const prevConciergeReportID = usePrevious(conciergeReportID);
    const prevCurrentUserLogin = usePrevious(currentUserLogin);
    const prevAccountID = usePrevious(accountID);

    /**
     * Find the reports that need to be updated in the LHN
     */
    const getUpdatedReports = useCallback(() => {
        const reportsToUpdate = new Set<string>();

        if (
            isDefaultRoomsBetaEnabled !== prevIsDefaultRoomsBetaEnabled ||
            priorityMode !== prevPriorityMode ||
            isOffline !== prevIsOffline ||
            conciergeReportID !== prevConciergeReportID ||
            currentUserLogin !== prevCurrentUserLogin ||
            accountID !== prevAccountID
        ) {
            for (const key of Object.keys(chatReports ?? {})) {
                reportsToUpdate.add(key);
            }
        }
        if (reportUpdates) {
            for (const key of Object.keys(reportUpdates ?? {})) {
                reportsToUpdate.add(key);
            }
        }
        if (reportNameValuePairsUpdates) {
            for (const key of Object.keys(reportNameValuePairsUpdates ?? {}).map((reportKey) => reportKey.replace(ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS, ONYXKEYS.COLLECTION.REPORT))) {
                reportsToUpdate.add(key);
            }
        }
        if (reportActionsUpdates) {
            for (const key of Object.keys(reportActionsUpdates).map((actionsKey) => actionsKey.replace(ONYXKEYS.COLLECTION.REPORT_ACTIONS, ONYXKEYS.COLLECTION.REPORT))) {
                reportsToUpdate.add(key);
            }
        }
        if (reportAttributesUpdates) {
            for (const reportID of reportAttributesUpdates) {
                reportsToUpdate.add(`${ONYXKEYS.COLLECTION.REPORT}${reportID}`);
            }
        }
        if (transactionsUpdates) {
            for (const key of Object.values(transactionsUpdates ?? {}).map((transaction) => `${ONYXKEYS.COLLECTION.REPORT}${transaction?.reportID}`)) {
                reportsToUpdate.add(key);
            }
        }
        if (transactionViolationsUpdates) {
            for (const key of Object.keys(transactionViolationsUpdates ?? {})
                .map((violationKey) => violationKey.replace(ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS, ONYXKEYS.COLLECTION.TRANSACTION))
                .map((transactionKey) => `${ONYXKEYS.COLLECTION.REPORT}${transactions?.[transactionKey]?.reportID}`)) {
                reportsToUpdate.add(key);
            }
        }
        if (reportsDraftsUpdates) {
            for (const key of Object.keys(reportsDraftsUpdates).map((draftKey) => draftKey.replace(ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT, ONYXKEYS.COLLECTION.REPORT))) {
                reportsToUpdate.add(key);
            }
        }
        if (policiesUpdates) {
            const updatedPolicies = new Set(Object.keys(policiesUpdates).map((policyKey) => policyKey.replace(ONYXKEYS.COLLECTION.POLICY, '')));
            for (const key of Object.entries(chatReports ?? {})
                .filter(([, value]) => {
                    if (!value?.policyID) {
                        return;
                    }

                    return updatedPolicies.has(value.policyID);
                })
                .map(([reportKey]) => reportKey)) {
                reportsToUpdate.add(key);
            }
        }

        // Make sure the previous and current reports are always included in the updates when we switch reports.
        if (prevDerivedCurrentReportID !== derivedCurrentReportID) {
            reportsToUpdate.add(`${ONYXKEYS.COLLECTION.REPORT}${prevDerivedCurrentReportID}`);
            reportsToUpdate.add(`${ONYXKEYS.COLLECTION.REPORT}${derivedCurrentReportID}`);
        }

        return Array.from(reportsToUpdate);
    }, [
        reportUpdates,
        reportNameValuePairsUpdates,
        reportActionsUpdates,
        reportAttributesUpdates,
        transactionsUpdates,
        transactionViolationsUpdates,
        reportsDraftsUpdates,
        policiesUpdates,
        chatReports,
        transactions,
        isDefaultRoomsBetaEnabled,
        priorityMode,
        prevIsDefaultRoomsBetaEnabled,
        prevPriorityMode,
        isOffline,
        prevIsOffline,
        conciergeReportID,
        prevConciergeReportID,
        currentUserLogin,
        prevCurrentUserLogin,
        accountID,
        prevAccountID,
        prevDerivedCurrentReportID,
        derivedCurrentReportID,
    ]);

    const reportsToDisplayInLHN = useMemo(() => {
        let updatedReports = getUpdatedReports();
        const hasCachedReports = Object.keys(currentReportsToDisplay).length > 0;

        // When guide personal details hydrate after the reports collection, guideAccountIDs changes but
        // getUpdatedReports() returns no report keys. Re-evaluate all reports so domain rooms previously
        // filtered out can appear in the LHN.
        if (hasCachedReports && prevGuideAccountIDs !== undefined && guideAccountIDs !== prevGuideAccountIDs) {
            updatedReports = Object.keys(chatReports ?? {});
        }

        // No updated keys means nothing the LHN reads has changed, as on the render after the provider's own state update.
        if (hasCachedReports && updatedReports.length === 0) {
            return currentReportsToDisplay;
        }

        let reportsToDisplay: ReportsToDisplayInLHN = {};
        if (hasCachedReports) {
            reportsToDisplay = SidebarUtils.updateReportsToDisplayInLHN({
                displayedReports: currentReportsToDisplay,
                reports: chatReports,
                // A report's LHN state also reads its parent, its chat and its parent message, so the linked displayed reports are rechecked with it.
                updatedReportsKeys: [...updatedReports, ...getLinkedReportKeys(updatedReports, chatReports, currentReportsToDisplay)],
                currentReportId: derivedCurrentReportID,
                isInFocusMode: priorityMode === CONST.PRIORITY_MODE.GSD,
                isDefaultRoomsBetaEnabled,
                transactionViolations,
                reportNameValuePairs,
                reportAttributes,
                draftComments: reportsDrafts,
                transactions,
                isOffline,
                currentUserLogin: currentUserLogin ?? '',
                currentUserAccountID: accountID,
                conciergeReportID,
                guideAccountIDs,
            });
        } else {
            Log.info('[useSidebarOrderedReports] building reportsToDisplay from scratch');
            reportsToDisplay = SidebarUtils.getReportsToDisplayInLHN({
                currentReportId: derivedCurrentReportID,
                reports: chatReports,
                isDefaultRoomsBetaEnabled,
                priorityMode,
                draftComments: reportsDrafts,
                transactionViolations,
                transactions,
                isOffline,
                currentUserLogin: currentUserLogin ?? '',
                currentUserAccountID: accountID,
                reportNameValuePairs,
                reportAttributes,
                conciergeReportID,
                guideAccountIDs,
            });
        }

        return reportsToDisplay;
        // Rule disabled intentionally — triggering a re-render on currentReportsToDisplay would cause an infinite loop
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        getUpdatedReports,
        chatReports,
        derivedCurrentReportID,
        priorityMode,
        isDefaultRoomsBetaEnabled,
        transactionViolations,
        reportNameValuePairs,
        reportAttributes,
        reportsDrafts,
        isOffline,
        clearCacheDummyCounter,
        currentUserLogin,
        accountID,
        conciergeReportID,
        guideAccountIDs,
        prevGuideAccountIDs,
    ]);

    useEffect(() => {
        setCurrentReportsToDisplay(reportsToDisplayInLHN);
    }, [reportsToDisplayInLHN]);

    const [lhnOrderIndex] = useState(() => new LHNOrderIndex());
    const isInDefaultMode = priorityMode !== CONST.PRIORITY_MODE.GSD;
    const lhnOrder = useMemo(
        () =>
            lhnOrderIndex.update({
                reportsToDisplay: reportsToDisplayInLHN,
                reportAttributes,
                reportNameValuePairs,
                draftComments: reportsDrafts,
                isInDefaultMode,
                localeCompare,
            }),
        [lhnOrderIndex, reportsToDisplayInLHN, reportAttributes, reportNameValuePairs, reportsDrafts, isInDefaultMode, localeCompare],
    );
    const orderedReportIDs = lhnOrder.reportIDs;

    // When a report is opened from the To-do/Unread tab (see setStickyReportID), we remember it so it
    // stays visible after viewing it removes it from the tab (e.g. it gets read). It's only set on a
    // non-All tab, so opening a chat from the All tab never makes it appear under Unread/To-do.
    const [stickyReport, setStickyReport] = useState<{reportID: string; tab: ValueOf<typeof CONST.INBOX_TAB>} | undefined>(undefined);

    // The reports for the active tab, plus the sticky report opened from it (kept visible even after it's read).
    const stickyReportID = stickyReport?.reportID;
    const stickyReportTab = stickyReport?.tab;
    const filteredReportIDs = useMemo(() => {
        const baseFilteredReportIDs = getReportIDsForInboxTab(lhnOrder, activeTab);
        if (activeTab === CONST.INBOX_TAB.ALL || !stickyReportID || stickyReportTab !== activeTab || baseFilteredReportIDs.includes(stickyReportID)) {
            return baseFilteredReportIDs;
        }
        if (!orderedReportIDs.includes(stickyReportID)) {
            // While opening the report, reading it can briefly drop it from the LHN set entirely (before
            // navigation marks it as the focused report). Keep it at the top so the list doesn't flash empty.
            return [stickyReportID, ...baseFilteredReportIDs];
        }
        const baseSet = new Set(baseFilteredReportIDs);
        return orderedReportIDs.filter((reportID) => baseSet.has(reportID) || reportID === stickyReportID);
    }, [lhnOrder, orderedReportIDs, activeTab, stickyReportTab, stickyReportID]);

    // Derived from the full "All" set (not the currently filtered view).
    const {counts: inboxTabCounts, hasStaleUnreadReport} = useMemo(() => getInboxTabSummary(lhnOrder), [lhnOrder]);

    // Held in a ref so getReportIDsForTab stays referentially stable, keeping the actions context stable.
    const lhnOrderRef = useRef(lhnOrder);
    useEffect(() => {
        lhnOrderRef.current = lhnOrder;
    }, [lhnOrder]);
    const getReportIDsForTab = useCallback((tab: ValueOf<typeof CONST.INBOX_TAB>) => getReportIDsForInboxTab(lhnOrderRef.current, tab), []);

    // Get the actual reports based on the filtered IDs
    const getOrderedReports = useCallback(
        (reportIDs: string[]): OnyxTypes.Report[] => {
            if (!chatReports) {
                return [];
            }
            return reportIDs.map((reportID) => chatReports[`${ONYXKEYS.COLLECTION.REPORT}${reportID}`]).filter(Boolean) as OnyxTypes.Report[];
        },
        [chatReports],
    );

    const filteredReports = useMemo(() => getOrderedReports(filteredReportIDs), [getOrderedReports, filteredReportIDs]);

    const clearLHNCache = useCallback(() => {
        Log.info('[useSidebarOrderedReports] Clearing sidebar cache manually via debug modal');
        setCurrentReportsToDisplay({});
        setClearCacheDummyCounter((current) => current + 1);
    }, []);

    const setActiveTab = useCallback((tab: ValueOf<typeof CONST.INBOX_TAB>) => {
        setInboxTab(tab);

        // The sticky report is scoped to the tab it was opened from, so reset it when switching tabs.
        setStickyReport(undefined);
    }, []);

    // Called when a report is opened from the LHN. On the To-do/Unread tabs we remember it so it stays
    // visible after viewing it removes it from the tab. On the All tab we keep nothing sticky.
    const setStickyReportID = useCallback(
        (reportID: string) => {
            if (activeTab === CONST.INBOX_TAB.ALL) {
                return;
            }
            setStickyReport({reportID, tab: activeTab});
        },
        [activeTab],
    );

    const stateValue: SidebarOrderedReportsStateContextValue = useMemo(
        () => ({
            filteredReports,
            orderedReportIDs,
            currentReportID: derivedCurrentReportID,
            chatTabBrickRoad: getChatTabBrickRoad(orderedReportIDs, reportAttributes),
            activeTab,
            inboxTabCounts,
            hasStaleUnreadReport,
        }),
        [filteredReports, orderedReportIDs, derivedCurrentReportID, reportAttributes, activeTab, inboxTabCounts, hasStaleUnreadReport],
    );

    const actionsValue: SidebarOrderedReportsActionsContextValue = useMemo(
        () => ({clearLHNCache, setActiveTab, setStickyReportID, getReportIDsForTab}),
        [clearLHNCache, setActiveTab, setStickyReportID, getReportIDsForTab],
    );

    return (
        <SidebarOrderedReportsStateContext.Provider value={stateValue}>
            <SidebarOrderedReportsActionsContext.Provider value={actionsValue}>{children}</SidebarOrderedReportsActionsContext.Provider>
        </SidebarOrderedReportsStateContext.Provider>
    );
}

function useSidebarOrderedReportsState() {
    return useContext(SidebarOrderedReportsStateContext);
}

function useSidebarOrderedReportsActions() {
    return useContext(SidebarOrderedReportsActionsContext);
}

function useSidebarOrderedReports() {
    const state = useSidebarOrderedReportsState();
    const actions = useSidebarOrderedReportsActions();
    // Memoize the merged result: OXC's React Compiler bails on this file, so without this the returned
    // object would be a fresh reference every render on web.
    return useMemo(() => ({...state, ...actions}), [state, actions]);
}

export {SidebarOrderedReportsContextProvider, useSidebarOrderedReports, useSidebarOrderedReportsState, useSidebarOrderedReportsActions};
export type {ReportsToDisplayInLHN};
