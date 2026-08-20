import Log from '@libs/Log';
import Navigation from '@libs/Navigation/Navigation';
import {getIsOffline} from '@libs/NetworkState';
import * as ReportActionUtils from '@libs/ReportActionsUtils';

import * as Report from '@userActions/Report';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import type {PushPayload} from '@ua/react-native-airship';

import Onyx from 'react-native-onyx';
import OnyxUtils from 'react-native-onyx/dist/OnyxUtils';

import parsePushNotificationPayload from './parsePushNotificationPayload';

// Push notifications aren't rendered using React, so it's impossible to access Onyx data with useOnyx(), therefore, it's OK to use connectWithoutView() here.

let currentUserAccountID = -1;
Onyx.connectWithoutView({
    key: ONYXKEYS.SESSION,
    callback: (value) => {
        currentUserAccountID = value?.accountID ?? CONST.DEFAULT_NUMBER_ID;
    },
});

/**
 * Returns whether the given Airship notification should be shown depending on the current state of the app.
 *
 * Lazy Onyx: this used to hold whole-collection subscriptions to `report_` and `reportActions_`, which
 * would force both collections to hydrate the moment this module loads (right after Onyx.init — and in
 * the Android HEADLESS context, where that read blows the wake-up budget). Instead it reads only the
 * topmost report's keys on demand, and FAILS OPEN — showing a notification on incomplete data beats
 * silently suppressing it.
 */
export default async function shouldShowPushNotification(pushPayload: PushPayload): Promise<boolean> {
    Log.info('[PushNotification] push notification received', false, {pushPayload});
    const data = parsePushNotificationPayload(pushPayload.extras.payload);

    if (!data) {
        return true;
    }

    let shouldShow = false;
    if (data.type === 'transaction') {
        shouldShow = true;
    } else if (Onyx.getHydrationStatus(ONYXKEYS.COLLECTION.REPORT) !== 'hydrated') {
        // The decision below depends on module-level report snapshots (inside
        // Report.shouldShowReportActionNotification) that only exist once reports hydrate — e.g. on a
        // headless wake. Fail open rather than deciding on missing data.
        Log.info('[PushNotification] Reports not hydrated yet — showing the notification (fail-open)');
        shouldShow = true;
    } else {
        const reportAction = ReportActionUtils.getLatestReportActionFromOnyxData(data.onyxData ?? null);
        const topmostReportID = Navigation.getTopmostReportId();
        const topmostReport = await OnyxUtils.get(`${ONYXKEYS.COLLECTION.REPORT}${topmostReportID}`);
        const topmostChatReport = await OnyxUtils.get(`${ONYXKEYS.COLLECTION.REPORT}${topmostReport?.chatReportID}`);
        const topmostReportActions = await OnyxUtils.get(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${topmostReportID}`);
        const topmostOneTransactionThreadReportID = ReportActionUtils.getOneTransactionThreadReportID(topmostReport, topmostChatReport, topmostReportActions, getIsOffline());
        shouldShow = Report.shouldShowReportActionNotification(String(data.reportID), topmostOneTransactionThreadReportID, currentUserAccountID, reportAction, true);
    }

    Log.info(`[PushNotification] ${shouldShow ? 'Showing' : 'Not showing'} notification`);
    return shouldShow;
}
