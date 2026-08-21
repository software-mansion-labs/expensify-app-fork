import {setInboxTab} from '@libs/actions/User';
import Log from '@libs/Log';
import {isArchivedReport} from '@libs/ReportUtils';
import SidebarUtils from '@libs/SidebarUtils';
import type {BrickRoad} from '@libs/WorkspacesSettingsUtils';
import {getChatTabBrickRoad} from '@libs/WorkspacesSettingsUtils';

import CONFIG from '@src/CONFIG';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type * as OnyxTypes from '@src/types/onyx';
import type {LHNReportAttributes, ReportAttributes} from '@src/types/onyx/DerivedValues';

import type {ValueOf} from 'type-fest';

import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useOnyxQuery} from 'react-native-onyx';

import useCollectionDelta from './useCollectionDelta';
import {useCurrentReportIDState} from './useCurrentReportID';
import useCurrentUserPersonalDetails from './useCurrentUserPersonalDetails';
import useDrainedOnyxQuery from './useDrainedOnyxQuery';
import useLocalize from './useLocalize';
import useMemberMap from './useMemberMap';
import useNetwork from './useNetwork';
import useOnyx from './useOnyx';
import usePrevious from './usePrevious';
import useReportAttributes from './useReportAttributes';
import useResponsiveLayout from './useResponsiveLayout';

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
};

type SidebarOrderedReportsActionsContextValue = {
    clearLHNCache: () => void;
    setActiveTab: (tab: ValueOf<typeof CONST.INBOX_TAB>) => void;
    setStickyReportID: (reportID: string) => void;
    /** Pages the lazy LHN window in when the list scrolls near its end (no-op on the classic provider). */
    loadMoreReports: () => void;
};

type ReportsToDisplayInLHN = Record<string, OnyxTypes.Report & {hasErrorsOtherThanFailedReceipt?: boolean; requiresAttention?: boolean; isUnreadReport?: boolean}>;

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
});

const SidebarOrderedReportsActionsContext = createContext<SidebarOrderedReportsActionsContextValue>({
    clearLHNCache: () => {},
    setActiveTab: () => {},
    setStickyReportID: () => {},
    loadMoreReports: () => {},
});

// This file does not compile with React Compiler (render-time ref cache below keeps referential
// stability), so the manual useMemo/useCallback in this provider are load-bearing and must stay.
function SidebarOrderedReportsClassicContextProvider({
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
    const [reportsDrafts] = useOnyx(ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT);
    const reportsDraftsUpdates = useCollectionDelta(reportsDrafts);
    const [betas] = useOnyx(ONYXKEYS.BETAS);
    const [conciergeReportID] = useOnyx(ONYXKEYS.CONCIERGE_REPORT_ID);
    const reportAttributes = useReportAttributes();
    const [currentReportsToDisplay, setCurrentReportsToDisplay] = useState<ReportsToDisplayInLHN>({});
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const {isOffline} = useNetwork();
    const {accountID, login: currentUserLogin} = useCurrentUserPersonalDetails();
    const {currentReportID: currentReportIDValue} = useCurrentReportIDState();
    const derivedCurrentReportID = currentReportIDForTests ?? currentReportIDValue;
    const prevDerivedCurrentReportID = usePrevious(derivedCurrentReportID);

    // we need to force reportsToDisplayInLHN to re-compute when we clear currentReportsToDisplay, but the way it currently works relies on not having currentReportsToDisplay as a memo dependency, so we just need something we can change to trigger it
    // I don't like it either, but clearing the cache is only a hack for the debug modal and I will endeavor to make it better as I work to improve the cache correctness of the LHN more broadly
    const [clearCacheDummyCounter, setClearCacheDummyCounter] = useState(0);

    const prevBetas = usePrevious(betas);
    const prevPriorityMode = usePrevious(priorityMode);
    const prevIsOffline = usePrevious(isOffline);
    const prevConciergeReportID = usePrevious(conciergeReportID);

    /**
     * Find the reports that need to be updated in the LHN
     */
    const getUpdatedReports = useCallback(() => {
        const reportsToUpdate = new Set<string>();

        if (betas !== prevBetas || priorityMode !== prevPriorityMode || isOffline !== prevIsOffline || conciergeReportID !== prevConciergeReportID) {
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
        transactionsUpdates,
        transactionViolationsUpdates,
        reportsDraftsUpdates,
        policiesUpdates,
        chatReports,
        transactions,
        betas,
        priorityMode,
        prevBetas,
        prevPriorityMode,
        isOffline,
        prevIsOffline,
        conciergeReportID,
        prevConciergeReportID,
        prevDerivedCurrentReportID,
        derivedCurrentReportID,
    ]);

    const reportsToDisplayInLHN = useMemo(() => {
        const updatedReports = getUpdatedReports();
        const hasCachedReports = Object.keys(currentReportsToDisplay).length > 0;

        // When reportAttributes changes (e.g. on startup hydration) but no report-specific keys were
        // updated, getUpdatedReports() returns []. Rather than falling through to a full scan of all
        // reports, recheck only the already-displayed reports with the new reportAttributes.
        const effectiveUpdatedReports = updatedReports.length === 0 && hasCachedReports ? Object.keys(currentReportsToDisplay) : updatedReports;
        const shouldDoIncrementalUpdate = effectiveUpdatedReports.length > 0 && hasCachedReports;
        let reportsToDisplay = {};
        if (shouldDoIncrementalUpdate) {
            reportsToDisplay = SidebarUtils.updateReportsToDisplayInLHN({
                displayedReports: currentReportsToDisplay,
                reports: chatReports,
                updatedReportsKeys: effectiveUpdatedReports,
                currentReportId: derivedCurrentReportID,
                isInFocusMode: priorityMode === CONST.PRIORITY_MODE.GSD,
                betas,
                transactionViolations,
                reportNameValuePairs,
                reportAttributes,
                draftComments: reportsDrafts,
                transactions,
                isOffline,
                currentUserLogin: currentUserLogin ?? '',
                currentUserAccountID: accountID,
                conciergeReportID,
            });
        } else {
            Log.info('[useSidebarOrderedReports] building reportsToDisplay from scratch');
            reportsToDisplay = SidebarUtils.getReportsToDisplayInLHN({
                currentReportId: derivedCurrentReportID,
                reports: chatReports,
                betas,
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
        betas,
        transactionViolations,
        reportNameValuePairs,
        reportAttributes,
        reportsDrafts,
        isOffline,
        clearCacheDummyCounter,
        currentUserLogin,
        accountID,
        conciergeReportID,
    ]);

    // Derive a stable boolean map indicating which reports have drafts.
    const hasDraftByReportIDRef = useRef<Record<string, boolean>>({});
    const hasDraftByReportID = useMemo(() => {
        const result: Record<string, boolean> = {};
        if (reportsDrafts) {
            for (const [key, value] of Object.entries(reportsDrafts)) {
                if (value) {
                    result[key.replace(ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT, '')] = true;
                }
            }
        }
        const prev = hasDraftByReportIDRef.current;
        const prevKeys = Object.keys(prev);
        const newKeys = Object.keys(result);
        if (prevKeys.length === newKeys.length && newKeys.every((k) => k in prev)) {
            return prev;
        }
        hasDraftByReportIDRef.current = result;
        return result;
    }, [reportsDrafts]);

    useEffect(() => {
        setCurrentReportsToDisplay(reportsToDisplayInLHN);
    }, [reportsToDisplayInLHN]);

    const getOrderedReportIDs = useCallback(
        () => SidebarUtils.sortReportsToDisplayInLHN(reportsToDisplayInLHN, priorityMode, localeCompare, hasDraftByReportID, reportNameValuePairs, reportAttributes),
        // Rule disabled intentionally - reports should be sorted only when the reportsToDisplayInLHN changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [reportsToDisplayInLHN, localeCompare, hasDraftByReportID, reportAttributes],
    );

    const orderedReportIDs = useMemo(() => getOrderedReportIDs(), [getOrderedReportIDs]);

    // When a report is opened from the To-do/Unread tab (see setStickyReportID), we remember it so it
    // stays visible after viewing it removes it from the tab (e.g. it gets read). It's only set on a
    // non-All tab, so opening a chat from the All tab never makes it appear under Unread/To-do.
    const [stickyReport, setStickyReport] = useState<{reportID: string; tab: ValueOf<typeof CONST.INBOX_TAB>} | undefined>(undefined);

    // The reports for the active tab, plus the sticky report opened from it (kept visible even after it's read).
    const stickyReportID = stickyReport?.reportID;
    const stickyReportTab = stickyReport?.tab;
    const filteredReportIDs = useMemo(() => {
        const baseFilteredReportIDs = SidebarUtils.filterReportsForInboxTab(orderedReportIDs, reportsToDisplayInLHN, activeTab);
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
    }, [orderedReportIDs, reportsToDisplayInLHN, activeTab, stickyReportTab, stickyReportID]);

    // The count shown in each tab's badge, derived from the full "All" set (not the currently filtered view).
    const inboxTabCounts = useMemo(() => SidebarUtils.getInboxTabCounts(orderedReportIDs, reportsToDisplayInLHN), [orderedReportIDs, reportsToDisplayInLHN]);

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

    const stateValue: SidebarOrderedReportsStateContextValue = useMemo(() => {
        // We need to make sure the current report is in the list of reports, but we do not want
        // to have to re-generate the list every time the currentReportID changes. To do that
        // we first generate the list as if there was no current report, then we check if
        // the current report is missing from the list, which should very rarely happen. In this
        // case we re-generate the list a 2nd time with the current report included.

        // We also execute the following logic if `shouldUseNarrowLayout` is false because this is
        // requirement for web. Consider a case, where we have report with expenses and we click on
        // any expense, a new LHN item is added in the list and is visible on web. But on mobile, we
        // just navigate to the screen with expense details, so there seems no point to execute this logic on mobile.
        // Only the "All" tab force-regenerates to surface the current report. On the To-do/Unread tabs the
        // sticky-aware filteredReportIDs already keeps the opened report visible, and re-filtering here
        // (without the sticky report) would briefly empty the list while opening it.
        if (
            activeTab === CONST.INBOX_TAB.ALL &&
            (!shouldUseNarrowLayout || filteredReportIDs.length === 0) &&
            derivedCurrentReportID &&
            derivedCurrentReportID !== '-1' &&
            filteredReportIDs.indexOf(derivedCurrentReportID) === -1
        ) {
            const updatedReportIDs = getOrderedReportIDs();
            const updatedFilteredIDs = SidebarUtils.filterReportsForInboxTab(updatedReportIDs, reportsToDisplayInLHN, activeTab);
            const updatedReports = getOrderedReports(updatedFilteredIDs);
            return {
                filteredReports: updatedReports,
                orderedReportIDs: updatedReportIDs,
                currentReportID: derivedCurrentReportID,
                chatTabBrickRoad: getChatTabBrickRoad(updatedReportIDs, reportAttributes),
                activeTab,
                inboxTabCounts,
            };
        }

        return {
            filteredReports,
            orderedReportIDs,
            currentReportID: derivedCurrentReportID,
            chatTabBrickRoad: getChatTabBrickRoad(orderedReportIDs, reportAttributes),
            activeTab,
            inboxTabCounts,
        };
    }, [
        getOrderedReportIDs,
        orderedReportIDs,
        filteredReportIDs,
        derivedCurrentReportID,
        shouldUseNarrowLayout,
        getOrderedReports,
        filteredReports,
        reportAttributes,
        activeTab,
        inboxTabCounts,
        reportsToDisplayInLHN,
    ]);

    const actionsValue: SidebarOrderedReportsActionsContextValue = useMemo(
        () => ({clearLHNCache, setActiveTab, setStickyReportID, loadMoreReports: () => {}}),
        [clearLHNCache, setActiveTab, setStickyReportID],
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

/** How many LHN rows the lazy window reads per batch and at most keeps live. */
const LHN_WINDOW_BATCH_SIZE = 50;
const LHN_WINDOW_MAX_SIZE = 200;
const LHN_PINNED_BATCH_SIZE = 100;
const LHN_PINNED_MAX_SIZE = 500;

/**
 * Lazy-Onyx POC (SOTA LHN): sources the LHN from indexed, windowed queries over the
 * `derivedReportAttributes_` projection instead of whole-collection subscriptions — only the
 * displayed slice is ever read. Runtime factors the projection deliberately doesn't materialize
 * (the focused report, drafted reports) are added client-side from member reads. Known POC
 * deltas vs the classic provider: tab counts and the errors/GBR groups only cover the loaded
 * window (+pinned), and rows beyond LHN_WINDOW_MAX_SIZE aren't paged in yet.
 */
function SidebarOrderedReportsLazyContextProvider({children, currentReportIDForTests}: SidebarOrderedReportsContextProviderProps) {
    const {localeCompare} = useLocalize();
    const [priorityMode = CONST.PRIORITY_MODE.DEFAULT] = useOnyx(ONYXKEYS.NVP_PRIORITY_MODE);
    const [inboxTab = CONST.INBOX_TAB.ALL] = useOnyx(ONYXKEYS.NVP_INBOX_TAB);
    const activeTab = inboxTab ?? CONST.INBOX_TAB.ALL;
    const isInFocusMode = priorityMode === CONST.PRIORITY_MODE.GSD;
    const {currentReportID: currentReportIDValue} = useCurrentReportIDState();
    const derivedCurrentReportID = currentReportIDForTests ?? currentReportIDValue;

    // The eligible window in the active mode's order — the core "load only what's displayed" read.
    const windowQuery = useMemo(
        () =>
            isInFocusMode
                ? {
                      where: [{field: 'lhnEligibleFocus', operator: 'eq' as const, value: 1}],
                      orderBy: {field: 'sortName', direction: 'asc' as const},
                      batchSize: LHN_WINDOW_BATCH_SIZE,
                      maxWindowSize: LHN_WINDOW_MAX_SIZE,
                  }
                : {
                      where: [{field: 'lhnEligibleDefault', operator: 'eq' as const, value: 1}],
                      orderBy: {field: 'lastVisibleActionCreated', direction: 'desc' as const},
                      batchSize: LHN_WINDOW_BATCH_SIZE,
                      maxWindowSize: LHN_WINDOW_MAX_SIZE,
                  },
        [isInFocusMode],
    );
    const {items: windowItems, loadMore: loadMoreWindow, hasMore: windowHasMore} = useOnyxQuery(ONYXKEYS.COLLECTION.DERIVED_REPORT_ATTRIBUTES, windowQuery);
    // Pinned reports sort into the top group regardless of recency, so they're read separately (small).
    const {items: pinnedItems} = useDrainedOnyxQuery(ONYXKEYS.COLLECTION.DERIVED_REPORT_ATTRIBUTES, {
        where: [{field: 'isPinned', operator: 'eq', value: 1}],
        orderBy: {field: 'sortName', direction: 'asc'},
        batchSize: LHN_PINNED_BATCH_SIZE,
        maxWindowSize: LHN_PINNED_MAX_SIZE,
    });
    // Drafted reports must show even when otherwise ineligible; the drafts collection is tiny.
    const [reportsDrafts] = useOnyx(ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT);

    const projections = useMemo(() => {
        const result: Record<string, LHNReportAttributes> = {};
        for (const item of [...windowItems, ...pinnedItems]) {
            if (!item.value) {
                continue;
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the query DSL returns untyped rows; every derivedReportAttributes_ value is an LHNReportAttributes
            result[item.key.slice(ONYXKEYS.COLLECTION.DERIVED_REPORT_ATTRIBUTES.length)] = item.value as LHNReportAttributes;
        }
        return result;
    }, [windowItems, pinnedItems]);

    const draftedReportIDs = useMemo(
        () =>
            Object.entries(reportsDrafts ?? {})
                .filter(([, value]) => !!value)
                .map(([key]) => key.replace(ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT, '')),
        [reportsDrafts],
    );

    const memberIDs = useMemo(() => [...Object.keys(projections), ...draftedReportIDs, derivedCurrentReportID], [projections, draftedReportIDs, derivedCurrentReportID]);
    const reportsMap = useMemberMap<OnyxTypes.Report>(ONYXKEYS.COLLECTION.REPORT, memberIDs);
    const reportNameValuePairsMap = useMemberMap<OnyxTypes.ReportNameValuePairs>(ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS, memberIDs);

    const reportsToDisplay: ReportsToDisplayInLHN = useMemo(() => {
        const result: ReportsToDisplayInLHN = {};
        const addReport = (reportID: string, projection: LHNReportAttributes | undefined) => {
            const reportKey = `${ONYXKEYS.COLLECTION.REPORT}${reportID}`;
            const report = reportsMap[reportKey];
            if (!report || reportKey in result) {
                return;
            }
            const isReportArchived = isArchivedReport(reportNameValuePairsMap[`${ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS}${reportID}`]);
            result[reportKey] = {
                ...report,
                requiresAttention: projection?.requiresAttention === 1,
                hasErrorsOtherThanFailedReceipt: projection?.brickRoadStatus === CONST.BRICK_ROAD_INDICATOR_STATUS.ERROR,
                isUnreadReport: SidebarUtils.getIsUnreadReportForInboxTab(report, isReportArchived),
            };
        };
        for (const [reportID, projection] of Object.entries(projections)) {
            addReport(reportID, projection);
        }
        for (const draftedReportID of draftedReportIDs) {
            addReport(draftedReportID, projections[draftedReportID]);
        }
        if (derivedCurrentReportID) {
            addReport(derivedCurrentReportID, projections[derivedCurrentReportID]);
        }
        return result;
    }, [projections, draftedReportIDs, derivedCurrentReportID, reportsMap, reportNameValuePairsMap]);

    // The name/attention map the sorter reads — minimal ReportAttributes entries built from the projection.
    const attributesForSort = useMemo(() => {
        const result: Record<string, ReportAttributes> = {};
        for (const [reportID, projection] of Object.entries(projections)) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the sorter/brick-road readers only touch these fields
            result[reportID] = {
                reportName: projection.reportName,
                requiresAttention: projection.requiresAttention === 1,
                brickRoadStatus: projection.brickRoadStatus,
            } as ReportAttributes;
        }
        return result;
    }, [projections]);

    const hasDraftByReportID = useMemo(() => {
        const result: Record<string, boolean> = {};
        for (const draftedReportID of draftedReportIDs) {
            result[draftedReportID] = true;
        }
        return result;
    }, [draftedReportIDs]);

    const orderedReportIDs = useMemo(
        () => SidebarUtils.sortReportsToDisplayInLHN(reportsToDisplay, priorityMode, localeCompare, hasDraftByReportID, reportNameValuePairsMap, attributesForSort),
        [reportsToDisplay, priorityMode, localeCompare, hasDraftByReportID, reportNameValuePairsMap, attributesForSort],
    );

    // Sticky report handling — identical to the classic provider (provider-local UI state).
    const [stickyReport, setStickyReport] = useState<{reportID: string; tab: ValueOf<typeof CONST.INBOX_TAB>} | undefined>(undefined);
    const stickyReportID = stickyReport?.reportID;
    const stickyReportTab = stickyReport?.tab;
    const filteredReportIDs = useMemo(() => {
        const baseFilteredReportIDs = SidebarUtils.filterReportsForInboxTab(orderedReportIDs, reportsToDisplay, activeTab);
        if (activeTab === CONST.INBOX_TAB.ALL || !stickyReportID || stickyReportTab !== activeTab || baseFilteredReportIDs.includes(stickyReportID)) {
            return baseFilteredReportIDs;
        }
        if (!orderedReportIDs.includes(stickyReportID)) {
            return [stickyReportID, ...baseFilteredReportIDs];
        }
        const baseSet = new Set(baseFilteredReportIDs);
        return orderedReportIDs.filter((reportID) => baseSet.has(reportID) || reportID === stickyReportID);
    }, [orderedReportIDs, reportsToDisplay, activeTab, stickyReportTab, stickyReportID]);

    const inboxTabCounts = useMemo(() => SidebarUtils.getInboxTabCounts(orderedReportIDs, reportsToDisplay), [orderedReportIDs, reportsToDisplay]);

    const filteredReports = useMemo(
        () => filteredReportIDs.map((reportID) => reportsMap[`${ONYXKEYS.COLLECTION.REPORT}${reportID}`]).filter((report): report is OnyxTypes.Report => !!report),
        [filteredReportIDs, reportsMap],
    );

    const setActiveTab = useCallback((tab: ValueOf<typeof CONST.INBOX_TAB>) => {
        setInboxTab(tab);
        setStickyReport(undefined);
    }, []);

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
            chatTabBrickRoad: getChatTabBrickRoad(orderedReportIDs, attributesForSort),
            activeTab,
            inboxTabCounts,
        }),
        [filteredReports, orderedReportIDs, derivedCurrentReportID, attributesForSort, activeTab, inboxTabCounts],
    );

    const loadMoreReports = useCallback(() => {
        if (!windowHasMore) {
            return;
        }
        loadMoreWindow();
    }, [windowHasMore, loadMoreWindow]);

    // The lazy source has no LHN cache to clear — the queries are the source of truth.
    const actionsValue: SidebarOrderedReportsActionsContextValue = useMemo(
        () => ({clearLHNCache: () => {}, setActiveTab, setStickyReportID, loadMoreReports}),
        [setActiveTab, setStickyReportID, loadMoreReports],
    );

    return (
        <SidebarOrderedReportsStateContext.Provider value={stateValue}>
            <SidebarOrderedReportsActionsContext.Provider value={actionsValue}>{children}</SidebarOrderedReportsActionsContext.Provider>
        </SidebarOrderedReportsStateContext.Provider>
    );
}

// The flag is a build-time constant, so exactly one provider implementation (and its hook set) ever
// renders — the branch below never changes within a session.
function SidebarOrderedReportsContextProvider(props: SidebarOrderedReportsContextProviderProps) {
    if (CONFIG.LAZY_LHN) {
        // eslint-disable-next-line react/jsx-props-no-spreading
        return <SidebarOrderedReportsLazyContextProvider {...props} />;
    }
    // eslint-disable-next-line react/jsx-props-no-spreading
    return <SidebarOrderedReportsClassicContextProvider {...props} />;
}

export {SidebarOrderedReportsContextProvider, SidebarOrderedReportsLazyContextProvider, useSidebarOrderedReports, useSidebarOrderedReportsState, useSidebarOrderedReportsActions};
export type {ReportsToDisplayInLHN};
