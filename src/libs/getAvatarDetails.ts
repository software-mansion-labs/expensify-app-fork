import type {OnyxCollection, OnyxEntry} from 'react-native-onyx';
import {FallbackAvatar} from '@components/Icon/Expensicons';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {PersonalDetails, PersonalDetailsList, Policy, Report, ReportAction, ReportActions, Transaction} from '@src/types/onyx';
import type {Icon} from '@src/types/onyx/OnyxCommon';
import {selectAllTransactionsForReport} from './MoneyRequestReportUtils';
import {getPersonalDetailByEmail} from './PersonalDetailsUtils';
import {getOriginalMessage, isMoneyRequestAction} from './ReportActionsUtils';
import {
    getDefaultWorkspaceAvatar,
    getDisplayNameForParticipant,
    getIcons,
    getPolicyName,
    getReportActionActorAccountID,
    getWorkspaceIcon,
    isDM,
    isIndividualInvoiceRoom,
    isInvoiceReport as isInvoiceReportUtils,
    isInvoiceRoom,
    isPolicyExpenseChat,
    isTripRoom as isTripRoomReportUtils,
} from './ReportUtils';

type ReportAvatarDetails = {
    reportPreviewSenderID: number | undefined;
    reportPreviewAction: OnyxEntry<ReportAction>;
    primaryAvatar: Icon;
    secondaryAvatar: Icon;
    shouldDisplayAllActors: boolean;
    displayName: string;
    isWorkspaceActor: boolean;
    actorHint: string;
    fallbackIcon: string | undefined;
    actorAccountID: number | null | undefined;
    delegatePersonalDetails: PersonalDetails | undefined | null;
    accountID: number;
};

function getSplitAuthor(transaction: Transaction, splits?: Array<ReportAction<typeof CONST.REPORT.ACTIONS.TYPE.IOU>>) {
    const {originalTransactionID, source} = transaction.comment ?? {};

    if (source !== CONST.IOU.TYPE.SPLIT || originalTransactionID === undefined) {
        return undefined;
    }

    const splitAction = splits?.find((split) => getOriginalMessage(split)?.IOUTransactionID === originalTransactionID);

    if (!splitAction) {
        return undefined;
    }

    return splitAction.actorAccountID;
}

function getAvatarDetails({
    action: passedAction,
    chatReport,
    iouReport,
    policies,
    personalDetails,
    chatReportActions,
    reportActions,
    allTransactions,
}: {
    action: OnyxEntry<ReportAction>;
    chatReport: OnyxEntry<Report>;
    iouReport: OnyxEntry<Report>;
    personalDetails: OnyxEntry<PersonalDetailsList>;
    policies: OnyxCollection<Policy>;
    chatReportActions: OnyxEntry<ReportActions>;
    reportActions: OnyxEntry<ReportActions>;
    allTransactions: OnyxCollection<Transaction>;
}): ReportAvatarDetails {
    const action = passedAction ?? (iouReport?.parentReportActionID ? chatReportActions?.[iouReport?.parentReportActionID] : undefined);

    const reportPreviewSenderID = getReportPreviewSenderID({action, chatReportActions, iouReport, chatReport, reportActions, allTransactions});

    const delegatePersonalDetails = action?.delegateAccountID ? personalDetails?.[action?.delegateAccountID] : undefined;
    const actorAccountID = getReportActionActorAccountID(action, iouReport, chatReport, delegatePersonalDetails);
    const accountID = reportPreviewSenderID ?? actorAccountID ?? CONST.DEFAULT_NUMBER_ID;

    const ownerAccountID = iouReport?.ownerAccountID ?? action?.childOwnerAccountID;
    const isReportPreviewAction = action?.actionName === CONST.REPORT.ACTIONS.TYPE.REPORT_PREVIEW;

    const usePersonalDetailsAvatars = !iouReport && chatReport;

    const policyID = chatReport?.policyID === CONST.POLICY.ID_FAKE || !chatReport?.policyID ? iouReport?.policyID : chatReport?.policyID;
    const policy = policies?.[`${ONYXKEYS.COLLECTION.POLICY}${policyID}`];

    const invoiceReceiverPolicy =
        chatReport?.invoiceReceiver && 'policyID' in chatReport.invoiceReceiver ? policies?.[`${ONYXKEYS.COLLECTION.POLICY}${chatReport.invoiceReceiver.policyID}`] : undefined;

    const {avatar, login, fallbackIcon} = personalDetails?.[accountID] ?? {};

    const isTripRoom = isTripRoomReportUtils(chatReport);
    // We want to display only the sender's avatar next to the report preview if it only contains one person's expenses.
    const displayAllActors = isReportPreviewAction && !isTripRoom && !isPolicyExpenseChat(chatReport) && !reportPreviewSenderID;
    const isInvoiceReport = isInvoiceReportUtils(iouReport ?? null);
    const isWorkspaceActor = isInvoiceReport || (isPolicyExpenseChat(chatReport) && (!actorAccountID || displayAllActors));

    const defaultDisplayName = getDisplayNameForParticipant({accountID, personalDetailsData: personalDetails}) ?? '';
    const defaultAvatar = {
        source: avatar ?? FallbackAvatar,
        id: accountID,
        name: defaultDisplayName,
        type: CONST.ICON_TYPE_AVATAR,
    };
    const defaultSecondaryAvatar = {name: '', source: '', type: CONST.ICON_TYPE_AVATAR, id: 0};

    const getPrimaryAvatar = () => {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        const actorHint = isWorkspaceActor ? getPolicyName({report: chatReport, policy}) : (login || (defaultDisplayName ?? '')).replace(CONST.REGEX.MERGED_ACCOUNT_PREFIX, '');

        if (isWorkspaceActor) {
            return {
                avatar: {
                    ...defaultAvatar,
                    name: getPolicyName({report: chatReport, policy}),
                    type: CONST.ICON_TYPE_WORKSPACE,
                    source: getWorkspaceIcon(chatReport, policy).source,
                    id: chatReport?.policyID,
                },
                actorHint,
            };
        }

        if (delegatePersonalDetails) {
            return {
                avatar: {
                    ...defaultAvatar,
                    name: delegatePersonalDetails?.displayName ?? '',
                    source: delegatePersonalDetails?.avatar ?? FallbackAvatar,
                    id: delegatePersonalDetails?.accountID,
                },
                actorHint,
            };
        }

        if (isReportPreviewAction && isTripRoom) {
            return {
                avatar: {
                    ...defaultAvatar,
                    name: chatReport?.reportName ?? '',
                    source: personalDetails?.[ownerAccountID ?? CONST.DEFAULT_NUMBER_ID]?.avatar ?? FallbackAvatar,
                    id: ownerAccountID,
                },
                actorHint,
            };
        }

        return {
            avatar: defaultAvatar,
            actorHint,
        };
    };

    const getSecondaryAvatar = () => {
        // If this is a report preview, display names and avatars of both people involved
        if (displayAllActors) {
            const secondaryAccountId = ownerAccountID === actorAccountID || isInvoiceReport ? actorAccountID : ownerAccountID;
            const secondaryUserAvatar = personalDetails?.[secondaryAccountId ?? -1]?.avatar ?? FallbackAvatar;
            const secondaryDisplayName = getDisplayNameForParticipant({accountID: secondaryAccountId});
            const secondaryPolicyAvatar = invoiceReceiverPolicy?.avatarURL ?? getDefaultWorkspaceAvatar(invoiceReceiverPolicy?.name);
            const isWorkspaceInvoice = isInvoiceRoom(chatReport) && !isIndividualInvoiceRoom(chatReport);

            return isWorkspaceInvoice
                ? {
                      source: secondaryPolicyAvatar,
                      type: CONST.ICON_TYPE_WORKSPACE,
                      name: invoiceReceiverPolicy?.name,
                      id: invoiceReceiverPolicy?.id,
                  }
                : {
                      source: secondaryUserAvatar,
                      type: CONST.ICON_TYPE_AVATAR,
                      name: secondaryDisplayName ?? '',
                      id: secondaryAccountId,
                  };
        }

        if (!isWorkspaceActor) {
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            const avatarIconIndex = chatReport?.isOwnPolicyExpenseChat || isPolicyExpenseChat(chatReport) ? 0 : 1;
            const reportIcons = getIcons(chatReport, personalDetails, undefined, undefined, undefined, policy);

            return reportIcons.at(avatarIconIndex) ?? defaultSecondaryAvatar;
        }

        if (isInvoiceReportUtils(iouReport)) {
            const secondaryAccountId = iouReport?.managerID ?? CONST.DEFAULT_NUMBER_ID;
            const secondaryUserAvatar = personalDetails?.[secondaryAccountId ?? -1]?.avatar ?? FallbackAvatar;
            const secondaryDisplayName = getDisplayNameForParticipant({accountID: secondaryAccountId});

            return {
                source: secondaryUserAvatar,
                type: CONST.ICON_TYPE_AVATAR,
                name: secondaryDisplayName,
                id: secondaryAccountId,
            };
        }

        return defaultSecondaryAvatar;
    };

    const {avatar: primaryAvatar, actorHint} = getPrimaryAvatar();
    const secondaryAvatar = getSecondaryAvatar();

    const icons = getIcons(chatReport ?? iouReport, personalDetails);

    return {
        primaryAvatar: (usePersonalDetailsAvatars ? icons.at(0) : primaryAvatar) ?? defaultAvatar,
        secondaryAvatar: (usePersonalDetailsAvatars ? icons.at(1) : secondaryAvatar) ?? defaultSecondaryAvatar,
        shouldDisplayAllActors: displayAllActors,
        displayName: (usePersonalDetailsAvatars ? icons.at(0)?.name : primaryAvatar.name) ?? '',
        isWorkspaceActor,
        actorHint,
        fallbackIcon,
        accountID,
        actorAccountID,
        delegatePersonalDetails,
        reportPreviewSenderID,
        reportPreviewAction: reportPreviewSenderID ? action : undefined,
    };
}

function getReportPreviewSenderID({
    iouReport,
    action,
    chatReport,
    chatReportActions,
    reportActions,
    allTransactions,
}: {
    action: OnyxEntry<ReportAction>;
    chatReport: OnyxEntry<Report>;
    iouReport: OnyxEntry<Report>;
    chatReportActions: OnyxEntry<ReportActions>;
    reportActions: OnyxEntry<ReportActions>;
    allTransactions: OnyxCollection<Transaction>;
}) {
    const iouActions = Object.values(reportActions ?? {}).filter(isMoneyRequestAction);

    const transactions = selectAllTransactionsForReport(allTransactions, action?.childReportID ?? iouReport?.reportID, iouActions ?? []);

    if (action?.actionName !== CONST.REPORT.ACTIONS.TYPE.REPORT_PREVIEW) {
        return undefined;
    }

    const splits = Object.values(chatReportActions ?? {})
        .filter(isMoneyRequestAction)
        .filter((act) => getOriginalMessage(act)?.type === CONST.IOU.REPORT_ACTION_TYPE.SPLIT);

    // 1. If all amounts have the same sign - either all amounts are positive or all amounts are negative.
    // We have to do it this way because there can be a case when actions are not available
    // See: https://github.com/Expensify/App/pull/64802#issuecomment-3008944401

    const areAmountsSignsTheSame = new Set(transactions?.map((tr) => Math.sign(tr.amount))).size < 2;

    // 2. If there is only one attendee - we check that by counting unique emails converted to account IDs in the attendees list.
    // This is a fallback added because: https://github.com/Expensify/App/pull/64802#issuecomment-3007906310

    const attendeesIDs = transactions
        // If the transaction is a split, then attendees are not present as a property so we need to use a helper function.
        ?.flatMap<number | undefined>((tr) =>
            tr.comment?.attendees?.map?.((att) => (tr.comment?.source === CONST.IOU.TYPE.SPLIT ? getSplitAuthor(tr, splits) : getPersonalDetailByEmail(att.email)?.accountID)),
        )
        .filter((accountID) => !!accountID);

    const isThereOnlyOneAttendee = new Set(attendeesIDs).size <= 1;

    // If the action is a 'Send Money' flow, it will only have one transaction, but the person who sent the money is the child manager account, not the child owner account.
    const isSendMoneyFlow = action?.childMoneyRequestCount === 0 && transactions?.length === 1 && isDM(chatReport);
    const singleAvatarAccountID = isSendMoneyFlow ? action.childManagerAccountID : action?.childOwnerAccountID;

    return areAmountsSignsTheSame && isThereOnlyOneAttendee ? singleAvatarAccountID : undefined;
}

export default getAvatarDetails;
