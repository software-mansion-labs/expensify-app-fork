import type {OnyxCollection, OnyxEntry} from 'react-native-onyx';
import {FallbackAvatar} from '@components/Icon/Expensicons';
import {selectAllTransactionsForReport} from '@libs/MoneyRequestReportUtils';
import {getPersonalDetailByEmail} from '@libs/PersonalDetailsUtils';
import {getOriginalMessage, isMoneyRequestAction} from '@libs/ReportActionsUtils';
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
} from '@libs/ReportUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {PersonalDetails, PersonalDetailsList, Policy, Report, ReportAction, Transaction} from '@src/types/onyx';
import type {Icon} from '@src/types/onyx/OnyxCommon';
import useOnyx from './useOnyx';

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

function getIconDetails({
    action,
    chatReport,
    iouReport,
    policies,
    personalDetails,
    reportPreviewSenderID,
    usePersonalDetailsAvatars,
    policy,
}: {
    action: OnyxEntry<ReportAction>;
    chatReport: OnyxEntry<Report>;
    iouReport: OnyxEntry<Report>;
    policy: OnyxEntry<Policy>;
    usePersonalDetailsAvatars?: boolean;
    reportPreviewSenderID: number | undefined;
    personalDetails: OnyxEntry<PersonalDetailsList>;
    policies: OnyxCollection<Policy>;
}) {
    const delegatePersonalDetails = action?.delegateAccountID ? personalDetails?.[action?.delegateAccountID] : undefined;
    const actorAccountID = getReportActionActorAccountID(action, iouReport, chatReport, delegatePersonalDetails);
    const accountID = reportPreviewSenderID ?? actorAccountID ?? CONST.DEFAULT_NUMBER_ID;

    const ownerAccountID = iouReport?.ownerAccountID ?? action?.childOwnerAccountID;
    const isReportPreviewAction = action?.actionName === CONST.REPORT.ACTIONS.TYPE.REPORT_PREVIEW;

    const invoiceReceiverPolicy =
        chatReport?.invoiceReceiver && 'policyID' in chatReport.invoiceReceiver ? policies?.[`${ONYXKEYS.COLLECTION.POLICY}${chatReport.invoiceReceiver.policyID}`] : undefined;

    const {avatar, login, fallbackIcon} = personalDetails?.[accountID] ?? {};

    const isTripRoom = isTripRoomReportUtils(chatReport);
    // We want to display only the sender's avatar next to the report preview if it only contains one person's expenses.
    // console.log(action, isReportPreviewAction, isTripRoom, isPolicyExpenseChat(chatReport), reportPreviewSenderID);
    const displayAllActors = isReportPreviewAction && !isTripRoom && !isPolicyExpenseChat(chatReport) && !reportPreviewSenderID;
    const isInvoiceReport = isInvoiceReportUtils(iouReport ?? null);
    const isWorkspaceActor = isInvoiceReport || (isPolicyExpenseChat(chatReport) && (!actorAccountID || displayAllActors));

    const getPrimaryAvatar = () => {
        const defaultDisplayName = getDisplayNameForParticipant({accountID, personalDetailsData: personalDetails});
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        const actorHint = isWorkspaceActor ? getPolicyName({report: chatReport, policy}) : (login || (defaultDisplayName ?? '')).replace(CONST.REGEX.MERGED_ACCOUNT_PREFIX, '');

        const defaultAvatar = {
            source: avatar ?? FallbackAvatar,
            id: accountID,
            name: defaultDisplayName,
            type: CONST.ICON_TYPE_AVATAR,
        };

        // console.log(arguments[0])

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
        const defaultAvatar = {name: '', source: '', type: CONST.ICON_TYPE_AVATAR, id: 0};

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

            return reportIcons.at(avatarIconIndex) ?? defaultAvatar;
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

        return defaultAvatar;
    };

    const {avatar: primaryAvatar, actorHint} = getPrimaryAvatar();
    const secondaryAvatar = getSecondaryAvatar();

    const icons = getIcons(chatReport ?? iouReport, personalDetails);

    return {
        primaryAvatar: usePersonalDetailsAvatars ? icons.at(0) : primaryAvatar,
        secondaryAvatar: usePersonalDetailsAvatars ? icons.at(1) : secondaryAvatar,
        shouldDisplayAllActors: displayAllActors,
        displayName: usePersonalDetailsAvatars ? icons.at(0)?.name : primaryAvatar.name,
        isWorkspaceActor,
        actorHint,
        fallbackIcon,
        accountID,
    };
}

/**
 * This hook is used to determine the ID of the sender, as well as the avatars of the actors and some additional data, for the report preview action.
 * It was originally based on actions; now, it uses transactions and unique emails as a fallback.
 * For a reason why, see https://github.com/Expensify/App/pull/64802 discussion.
 */
function useReportAvatarDetails({
    iouReport,
    chatReport,
    action: passedAction,
    usePersonalDetailsAvatars,
}: {
    iouReport: OnyxEntry<Report>;
    chatReport: OnyxEntry<Report>;
    action?: OnyxEntry<ReportAction>;
    usePersonalDetailsAvatars?: boolean;
}): ReportAvatarDetails {
    const [iouActions] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${iouReport?.reportID}`, {
        canBeMissing: true,
        selector: (actions) => Object.values(actions ?? {}).filter(isMoneyRequestAction),
    });

    const [onyxAction] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${iouReport?.parentReportID ?? chatReport?.reportID}`, {
        selector: (actions) => (iouReport?.parentReportActionID ? actions?.[iouReport?.parentReportActionID] : undefined),
        canBeMissing: true,
    });

    const action = passedAction ?? onyxAction;

    const [personalDetails] = useOnyx(ONYXKEYS.PERSONAL_DETAILS_LIST, {
        canBeMissing: true,
    });

    const [policies] = useOnyx(ONYXKEYS.COLLECTION.POLICY, {canBeMissing: true});

    const policyID = chatReport?.policyID === CONST.POLICY.ID_FAKE || !chatReport?.policyID ? iouReport?.policyID : chatReport?.policyID;
    const policy = policies?.[`${ONYXKEYS.COLLECTION.POLICY}${policyID}`];

    const [transactions] = useOnyx(ONYXKEYS.COLLECTION.TRANSACTION, {
        canBeMissing: true,
        selector: (allTransactions) => selectAllTransactionsForReport(allTransactions, action?.childReportID ?? iouReport?.reportID, iouActions ?? []),
    });

    const [splits] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${chatReport?.reportID}`, {
        canBeMissing: true,
        selector: (actions) =>
            Object.values(actions ?? {})
                .filter(isMoneyRequestAction)
                .filter((act) => getOriginalMessage(act)?.type === CONST.IOU.REPORT_ACTION_TYPE.SPLIT),
    });

    const delegatePersonalDetails = action?.delegateAccountID ? personalDetails?.[action?.delegateAccountID] : undefined;
    const actorAccountID = getReportActionActorAccountID(action, iouReport, chatReport, delegatePersonalDetails);

    if (action?.actionName !== CONST.REPORT.ACTIONS.TYPE.REPORT_PREVIEW) {
        const reportPreviewSenderID = undefined;

        // eslint-disable-next-line react-compiler/react-compiler
        const iconDetails = getIconDetails({
            policies,
            personalDetails,
            action,
            policy,
            chatReport,
            usePersonalDetailsAvatars,
            iouReport,
            reportPreviewSenderID,
        });

        return {
            reportPreviewSenderID,
            reportPreviewAction: undefined,
            actorAccountID,
            delegatePersonalDetails,
            ...iconDetails,
        };
    }

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

    const reportPreviewSenderID = areAmountsSignsTheSame && isThereOnlyOneAttendee ? singleAvatarAccountID : undefined;

    return {
        reportPreviewSenderID,
        reportPreviewAction: action,
        actorAccountID,
        delegatePersonalDetails,
        ...getIconDetails({
            policies,
            usePersonalDetailsAvatars,
            personalDetails,
            action,
            policy,
            chatReport,
            iouReport,
            reportPreviewSenderID,
        }),
    };
}

export default useReportAvatarDetails;
export type {ReportAvatarDetails};
export {getIconDetails};
