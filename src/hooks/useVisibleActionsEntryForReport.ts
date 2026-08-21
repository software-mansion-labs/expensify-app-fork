import getNonEmptyStringOnyxID from '@libs/getNonEmptyStringOnyxID';

import {computeReportVisibility} from '@userActions/OnyxDerived/configs/visibleReportActions';

import ONYXKEYS from '@src/ONYXKEYS';

import {useMemo} from 'react';

import useCurrentUserPersonalDetails from './useCurrentUserPersonalDetails';
import useOnyx from './useOnyx';

/**
 * One report's action-visibility map (`Record<reportActionID, boolean>`), computed ON DEMAND from a
 * single member-key subscription (lazy-Onyx POC): under lazy Onyx, reading the whole-app
 * VISIBLE_REPORT_ACTIONS derived value would start its engine and hydrate the entire reportActions
 * collection just to serve one report. Shares `computeReportVisibility` with the derived config, so
 * the semantics are identical.
 */
function useVisibleActionsEntryForReport(reportID?: string): Record<string, boolean> | undefined {
    const [reportActions] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${getNonEmptyStringOnyxID(reportID)}`);
    const {accountID: currentUserAccountID} = useCurrentUserPersonalDetails();

    return useMemo(() => {
        if (!reportActions) {
            return undefined;
        }
        return computeReportVisibility(reportActions, currentUserAccountID);
    }, [reportActions, currentUserAccountID]);
}

export default useVisibleActionsEntryForReport;
