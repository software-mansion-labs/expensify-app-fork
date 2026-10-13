import type {ReportHierarchyInfo} from '@userActions/ClearReportActionErrors';

import ONYXKEYS from '@src/ONYXKEYS';
import {reportAncestorsHierarchySelector} from '@src/selectors/Report';

import type {OnyxCollection} from 'react-native-onyx';

import useOnyx from './useOnyx';

/**
 * Subscribes to the parent hierarchy links (`parentReportID`/`parentReportActionID`) of a report and its ancestors,
 * the chain `clearAllRelatedReportActionErrors` walks up from that report, without subscribing to full report
 * objects. Since these links are effectively immutable, regular report updates don't re-render the subscriber.
 */
function useReportsParentHierarchy(reportID: string | undefined): OnyxCollection<ReportHierarchyInfo> {
    const [reportsParentHierarchy] = useOnyx(ONYXKEYS.COLLECTION.REPORT, {selector: reportAncestorsHierarchySelector(reportID)});
    return reportsParentHierarchy;
}

export default useReportsParentHierarchy;
