import {deferUntilAppReady} from '@libs/deferUntilAppReady';

import ONYXKEYS from '@src/ONYXKEYS';
import type {Policy, PolicyTagLists, Report, ReportAction, ReportAttributesDerivedValue} from '@src/types/onyx';

import type {OnyxCollection} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

import type {LocalNotificationClickHandler, LocalNotificationModifiedExpenseParams, LocalNotificationModule} from './types';

import BrowserNotifications from './BrowserNotifications';

let allPolicies: OnyxCollection<Policy>;
let allPolicyTags: OnyxCollection<PolicyTagLists>;

// These are temporary subscriptions until the modified-expense notification chain is fully migrated
// see https://github.com/Expensify/App/issues/66336
// Lazy-Onyx POC (purity lane): whole-collection subscriptions here would hydrate POLICY and
// POLICY_TAGS at module load — i.e. during boot. Deferred until the app is interactive; keyed
// fallback readers see undefined until the drain, same as before Onyx's first flush.
deferUntilAppReady(() => {
    Onyx.connectWithoutView({
        key: ONYXKEYS.COLLECTION.POLICY,
        callback: (value) => {
            allPolicies = value;
        },
    });

    Onyx.connectWithoutView({
        key: ONYXKEYS.COLLECTION.POLICY_TAGS,
        callback: (value) => {
            allPolicyTags = value;
        },
    });
}, 'low');

function showCommentNotification(report: Report, reportAction: ReportAction, onClick: LocalNotificationClickHandler, reportAttributes?: ReportAttributesDerivedValue['reports']) {
    BrowserNotifications.pushReportCommentNotification(report, reportAction, onClick, true, reportAttributes);
}

function showUpdateAvailableNotification() {
    BrowserNotifications.pushUpdateAvailableNotification();
}

function showModifiedExpenseNotification({report, reportAction, movedFromReport, movedToReport, onClick, currentUserLogin, reportAttributes}: LocalNotificationModifiedExpenseParams) {
    const policyID = report.policyID;
    const policyTags = policyID ? allPolicyTags?.[`${ONYXKEYS.COLLECTION.POLICY_TAGS}${policyID}`] : undefined;
    const policy = policyID ? allPolicies?.[`${ONYXKEYS.COLLECTION.POLICY}${policyID}`] : undefined;
    BrowserNotifications.pushModifiedExpenseNotification({
        report,
        reportAction,
        movedFromReport,
        movedToReport,
        onClick,
        usesIcon: true,
        policyTags,
        policy,
        currentUserLogin,
        reportAttributes,
    });
}

function clearReportNotifications(reportID: string | undefined) {
    if (!reportID) {
        return;
    }
    BrowserNotifications.clearNotifications((notificationData) => notificationData.reportID === reportID);
}

const LocalNotification: LocalNotificationModule = {
    showCommentNotification,
    showUpdateAvailableNotification,
    showModifiedExpenseNotification,
    clearReportNotifications,
};

export default LocalNotification;
