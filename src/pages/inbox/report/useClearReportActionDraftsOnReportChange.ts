import {useLastApplied} from '@hooks/useActivityIdentityGuard';

import {clearAllReportActionDrafts} from '@libs/actions/Report';

import {useEffect} from 'react';

// When the report changes, clear all report action edit drafts. The clear is keyed on the report itself so a
// covered screen keeps the edit the user has in progress.
function useClearReportActionDraftsOnReportChange(reportID: string | undefined) {
    const hasReportChanged = useLastApplied();

    useEffect(() => {
        if (!hasReportChanged(reportID ?? '')) {
            return;
        }

        clearAllReportActionDrafts();
    }, [reportID, hasReportChanged]);
}

export default useClearReportActionDraftsOnReportChange;
