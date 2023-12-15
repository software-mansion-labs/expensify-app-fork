import Onyx, {OnyxCollection} from 'react-native-onyx';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import {Report} from '@src/types/onyx';
import * as OptionsListUtils from './OptionsListUtils';
import * as ReportActionsUtils from './ReportActionsUtils';
import * as ReportUtils from './ReportUtils';

let allReports: OnyxCollection<Report>;
Onyx.connect({
    key: ONYXKEYS.COLLECTION.REPORT,
    waitForCollectionCallback: true,
    callback: (value) => (allReports = value),
});

const getBrickRoadForPolicy = (policyReport: Report) => {
    const policyReportAction = ReportActionsUtils.getAllReportActions(policyReport.reportID);
    const reportErrors = OptionsListUtils.getAllReportErrors(policyReport, policyReportAction);
    const brickRoadIndicator = Object.keys(reportErrors ?? {}).length !== 0 ? CONST.BRICK_ROAD_INDICATOR_STATUS.ERROR : '';
    if (brickRoadIndicator) {
        return 'redIndicator';
    }
    let itemParentReportAction = {};
    if (policyReport.parentReportID) {
        const itemParentReportActions = ReportActionsUtils.getAllReportActions(policyReport.parentReportID);
        itemParentReportAction = policyReport.parentReportActionID ? itemParentReportActions[policyReport.parentReportActionID] : {};
    }
    const optionFromPolicyReport = {...policyReport, isUnread: ReportUtils.isUnread(policyReport), isUnreadWithMention: ReportUtils.isUnreadWithMention(policyReport)};
    const shouldShowGreenDotIndicator = ReportUtils.requiresAttentionFromCurrentUser(optionFromPolicyReport, itemParentReportAction);
    return shouldShowGreenDotIndicator ? 'greenIndicator' : '';
};

function getWorkspacesBrickRoads() {
    if (!allReports) {
        return {};
    }

    const workspaceMap: Record<string, string> = {};

    if (!allReports) {
        return workspaceMap;
    }

    Object.keys(allReports).forEach((report) => {
        const policyID = allReports?.[report]?.policyID;
        const policyReport = allReports ? allReports[report] : null;
        if (!policyID || workspaceMap[policyID] === 'redIndicator' || !policyReport) {
            return;
        }
        const policyBrickRoad = getBrickRoadForPolicy(policyReport);

        if (!policyBrickRoad) {
            return;
        }

        workspaceMap[policyID] = policyBrickRoad;
    });

    return workspaceMap;
}

export {getBrickRoadForPolicy, getWorkspacesBrickRoads};
