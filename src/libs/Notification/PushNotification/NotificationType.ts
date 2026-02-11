import type {Simplify, ValueOf} from 'type-fest';
import type CONST from '@src/CONST';
import type {OnyxServerUpdate} from '@src/types/onyx/OnyxUpdatesFromServer';

const NotificationType = {
    REPORT_ACTION: 'reportAction',
    REPORT_COMMENT: 'reportComment',
    TRANSACTION: 'transaction',
    BLOCKING_MODAL: 'blockingModal',
} as const;

const BlockingModalType = {
    APPROVE_TRANSACTION: 'approveTransaction',
} as const;

type NotificationTypes = ValueOf<typeof NotificationType>;

type BlockingModalTypes = ValueOf<typeof BlockingModalType>;

type BlockingModalNotificationDataMap = {
    [BlockingModalType.APPROVE_TRANSACTION]: ApproveTransactionPushNotificationData;
};

type BlockingModalPushNotificationData<T extends BlockingModalTypes | undefined = undefined> = Simplify<
    T extends BlockingModalTypes ? BlockingModalNotificationDataMap[T] : ValueOf<BlockingModalNotificationDataMap>
>;

type NotificationDataMap = {
    [NotificationType.REPORT_ACTION]: ReportActionPushNotificationData;
    [NotificationType.REPORT_COMMENT]: ReportActionPushNotificationData;
    [NotificationType.TRANSACTION]: TransactionPushNotificationData;
    [NotificationType.BLOCKING_MODAL]: BlockingModalPushNotificationData;
};

type PushNotificationData = ReportActionPushNotificationData | TransactionPushNotificationData | BlockingModalPushNotificationData;

type BasePushNotificationData = {
    title: string;
    subtitle: string;
    type: ValueOf<typeof NotificationType>;
    onyxData?: OnyxServerUpdate[];
    lastUpdateID?: number;
    previousUpdateID?: number;
    hasPendingOnyxUpdates?: boolean;
};

type ReportActionPushNotificationData = BasePushNotificationData & {
    reportID: number;
    reportActionID: string;
};

type TransactionPushNotificationData = BasePushNotificationData & {
    reportID: number;
    // Due to its length and the rounding, the transactionID must be a string.
    transactionID: string;
};

type ApproveTransactionPushNotificationData = ReportActionPushNotificationData & {
    actionName: typeof CONST.REPORT.ACTIONS.TYPE.MULTIFACTOR_AUTHENTICATION.TRANSACTION_APPROVAL;
};

/**
 * See https://github.com/Expensify/Web-Expensify/blob/main/lib/MobilePushNotifications.php for the various
 * types of push notifications sent by our API.
 */
export default NotificationType;
export {BlockingModalType};
export type {NotificationTypes, NotificationDataMap, PushNotificationData, ReportActionPushNotificationData, TransactionPushNotificationData, BlockingModalPushNotificationData};
