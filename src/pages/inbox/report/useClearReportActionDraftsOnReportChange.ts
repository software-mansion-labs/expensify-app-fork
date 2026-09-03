import useScreenActivityEffect from '@hooks/useScreenActivityEffect';

import {clearAllReportActionDrafts} from '@libs/actions/Report';

// When the report screen is navigated away from or the report changes, clear all report action edit drafts
function useClearReportActionDraftsOnReportChange(reportID: string | undefined) {
    useScreenActivityEffect(() => {
        clearAllReportActionDrafts();

        return () => {
            clearAllReportActionDrafts();
        };
    }, [reportID]);
}

export default useClearReportActionDraftsOnReportChange;
