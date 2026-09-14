import {
    getReportActionsOrderSnapshot,
    setReportActionsOrderAnchorTime,
    setReportActionsOrderRawActions,
    subscribeToReportActionsOrder,
} from '@libs/ReportActionsOrder/ReportActionsOrderStore';
import {getSortedReportActionsForDisplay} from '@libs/ReportActionsUtils';
import {isEngineAvailable} from '@libs/SqlEngine/EngineClient';
import {getReportActionsEngineMode} from '@libs/SqlEngine/engineMode';

import type {ReportAction, ReportActions} from '@src/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

import {useEffect, useSyncExternalStore} from 'react';

const EMPTY_ACTIONS: ReportAction[] = [];

/** What the engine derived from the order it returned, so a consumer does not walk the ordered array again. */
type ReportActionsOrderDerived = {
    /** The position of every action of the order, shared by every consumer of that order. */
    idToIndex: Map<string, number>;
    /** The `lastReadTime` `unreadAnchorID` belongs to; a consumer holding another one must anchor itself. */
    anchorTime: string | undefined;
    /** The oldest action newer than `anchorTime`, empty when nothing is unread. */
    unreadAnchorID: string;
};

type ReportActionsOrderResult = {
    /** The display order, or undefined while there is nothing to order. */
    actions: ReportAction[] | undefined;
    /** Set only when `actions` is the array the engine ordered, so its derived values describe that array. */
    derived: ReportActionsOrderDerived | undefined;
};

/**
 * Ordered report actions for the report screen. Falls back to today's JS sort while the SQL engine is off,
 * unavailable or still working on the current Onyx value; the mode is read once per mount, so flipping the
 * dev toggle applies on the next mount. The nullable `actions` keeps the contract of the `useOnyx` selector
 * this hook replaced in `usePaginatedReportActions`. `anchorTime` is the `lastReadTime` the caller wants the
 * unread anchor resolved against, and nothing is resolved while it is undefined.
 */
function useReportActionsOrder(reportID: string | undefined, rawActions: OnyxEntry<ReportActions>, anchorTime?: string): ReportActionsOrderResult {
    const mode = getReportActionsEngineMode();
    const isEngineActive = mode !== 'off' && isEngineAvailable();

    const snapshot = useSyncExternalStore(
        (onStoreChange) => subscribeToReportActionsOrder(reportID, onStoreChange),
        () => getReportActionsOrderSnapshot(reportID),
        () => getReportActionsOrderSnapshot(reportID),
    );

    useEffect(() => {
        if (!isEngineActive || !reportID) {
            return;
        }
        setReportActionsOrderAnchorTime(reportID, anchorTime);
        setReportActionsOrderRawActions(reportID, rawActions);
    }, [anchorTime, isEngineActive, reportID, rawActions]);

    if (isEngineActive && snapshot && snapshot.raw === rawActions) {
        return {actions: snapshot.actions, derived: {idToIndex: snapshot.idToIndex, anchorTime: snapshot.anchorTime, unreadAnchorID: snapshot.anchorID}};
    }

    if (isEngineActive && mode === 'strict') {
        if (!snapshot) {
            return {actions: EMPTY_ACTIONS, derived: undefined};
        }
        return {actions: snapshot.actions, derived: {idToIndex: snapshot.idToIndex, anchorTime: snapshot.anchorTime, unreadAnchorID: snapshot.anchorID}};
    }

    return {actions: getSortedReportActionsForDisplay(rawActions, undefined, true), derived: undefined};
}

export default useReportActionsOrder;
export type {ReportActionsOrderDerived, ReportActionsOrderResult};
