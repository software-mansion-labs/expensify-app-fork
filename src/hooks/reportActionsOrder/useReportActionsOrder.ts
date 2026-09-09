import {getReportActionsOrderSnapshot, setReportActionsOrderRawActions, subscribeToReportActionsOrder} from '@libs/ReportActionsOrder/ReportActionsOrderStore';
import {getSortedReportActionsForDisplay} from '@libs/ReportActionsUtils';
import {isEngineAvailable} from '@libs/SqlEngine/EngineClient';
import {getReportActionsEngineMode} from '@libs/SqlEngine/engineMode';

import type {ReportAction, ReportActions} from '@src/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

import {useEffect, useSyncExternalStore} from 'react';

const EMPTY_ACTIONS: ReportAction[] = [];

/**
 * Ordered report actions for the report screen. Falls back to today's JS sort while the SQL engine is off,
 * unavailable or still working on the current Onyx value; the mode is read once per mount, so flipping the
 * dev toggle applies on the next mount. The nullable return keeps the contract of the `useOnyx` selector
 * this hook replaced in `usePaginatedReportActions`.
 */
function useReportActionsOrder(reportID: string | undefined, rawActions: OnyxEntry<ReportActions>, hasWriteAccess: boolean | undefined): ReportAction[] | undefined {
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
        setReportActionsOrderRawActions(reportID, rawActions);
    }, [isEngineActive, reportID, rawActions]);

    if (isEngineActive && snapshot && snapshot.raw === rawActions) {
        return snapshot.actions;
    }

    if (isEngineActive && mode === 'strict') {
        return snapshot?.actions ?? EMPTY_ACTIONS;
    }

    return getSortedReportActionsForDisplay(rawActions, hasWriteAccess, true, undefined, reportID);
}

export default useReportActionsOrder;
