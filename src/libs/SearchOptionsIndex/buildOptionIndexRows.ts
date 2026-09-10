import {formatPhoneNumber} from '@libs/LocalePhoneNumber';
import {getPersonalDetailOptionText} from '@libs/OptionsListUtils';
import {getPersonalDetailSearchTerms} from '@libs/OptionsListUtils/searchMatchUtils';
import {getReportName} from '@libs/ReportNameUtils';
import {
    getChatRoomSubtitle,
    getDisplayNameForParticipant,
    getParticipantsAccountIDsForDisplay,
    getReportNotificationPreference,
    isChatRoom,
    isChatThread,
    isGroupChat,
    isHiddenForCurrentUser,
    isMoneyRequest,
    isMoneyRequestReport,
    isOneOnOneChat,
    isPolicyExpenseChat,
    isSelfDM,
    isTaskReport,
} from '@libs/ReportUtils';
import type {OptionIndexRow} from '@libs/SqlEngine/wasm/protocol';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {PersonalDetails, Report} from '@src/types/onyx';

import deburr from 'lodash/deburr';

import type {SearchOptionsIndexInputs} from './types';

type ReportIndexEntry = {
    row: OptionIndexRow;
    /** The account this report is the 1:1 DM of, when it is one. Contacts borrow their DM's avatar and key. */
    dmAccountID: number | undefined;
};

/** Chat types the router never hides on the participant's notification preference. */
const NEVER_HIDDEN_CHAT_TYPES = new Set<string>([
    CONST.REPORT.CHAT_TYPE.SELF_DM,
    CONST.REPORT.CHAT_TYPE.POLICY_ADMINS,
    CONST.REPORT.CHAT_TYPE.POLICY_ROOM,
    CONST.REPORT.CHAT_TYPE.POLICY_EXPENSE_CHAT,
    CONST.REPORT.CHAT_TYPE.GROUP,
]);

/** Same normalization `getValidOptions` applies to both the option text and the typed terms. */
function normalizeSearchText(text: string): string {
    return deburr(text.toLocaleLowerCase());
}

function isDefinedDetail(detail: PersonalDetails | null | undefined): detail is PersonalDetails {
    return !!detail;
}

/** Mirrors the `excludeHidden` branch of `getValidOptions` on the raw report. */
function isReportHiddenFromRouter(report: Report, isThread: boolean, isArchived: boolean, currentUserAccountID: number): boolean {
    if (isThread) {
        return getReportNotificationPreference(report, currentUserAccountID) === CONST.REPORT.NOTIFICATION_PREFERENCE.HIDDEN;
    }
    if (isTaskReport(report) || isArchived || (report.chatType !== undefined && NEVER_HIDDEN_CHAT_TYPES.has(report.chatType))) {
        return false;
    }
    const participant = report.participants?.[currentUserAccountID];
    return !!participant && isHiddenForCurrentUser(participant.notificationPreference);
}

/**
 * The searchable text of a report, a superset of what `getValidOptions` matches on: the fields it concatenates,
 * concatenated the same way, plus the variants the canonical `filterReports` matcher derives from them.
 */
function buildReportSearchText(report: Report, text: string, login: string | undefined, extra: string): string {
    const variants = [text.replaceAll(/['-]/g, ''), login ? login.replace(CONST.EMAIL_SEARCH_REGEX, '') : ''];
    return normalizeSearchText([`${text}${login ?? ''}${extra}`, ...variants].join(' '));
}

/** Builds the index row of one report, or nothing when `processReport` would not admit it into the option list. */
function buildReportIndexEntry(report: Report, inputs: SearchOptionsIndexInputs): ReportIndexEntry | undefined {
    if (!report.reportID) {
        return undefined;
    }
    const accountIDs = getParticipantsAccountIDsForDisplay(report, false, false, false, undefined, inputs.personalDetails);
    const isRoom = isChatRoom(report);
    if (accountIDs.length === 0 && !isRoom) {
        return undefined;
    }

    const isThread = isChatThread(report);
    const isGroup = isGroupChat(report);
    const isExpenseChat = isPolicyExpenseChat(report);
    const isSelfDMReport = isSelfDM(report);
    const isArchived = !!inputs.privateIsArchivedMap[`${ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS}${report.reportID}`];
    const policy = inputs.policies?.[`${ONYXKEYS.COLLECTION.POLICY}${report.policyID}`];
    const details = accountIDs.map((accountID) => inputs.personalDetails?.[accountID]).filter(isDefinedDetail);
    const hasMultipleParticipants = details.length > 1 || isRoom || isExpenseChat || isGroup;
    const login = hasMultipleParticipants ? undefined : details.at(0)?.login;

    const text =
        getReportName(report, inputs.reportAttributes?.[report.reportID]?.reportName) ||
        (isSelfDMReport
            ? getDisplayNameForParticipant({
                  accountID: report.ownerAccountID,
                  shouldAddCurrentUserPostfix: true,
                  personalDetailsData: inputs.personalDetails ?? undefined,
                  formatPhoneNumber,
                  translate: inputs.translate,
              })
            : '');

    let extra = '';
    if (isThread) {
        extra = isMoneyRequest(report) || isMoneyRequestReport(report) ? inputs.translate('iou.expense') : inputs.translate('threads.thread');
    } else if (isRoom) {
        extra = getChatRoomSubtitle(report, policy, inputs.conciergeReportID, inputs.translate, true, isArchived) ?? '';
    } else if (isExpenseChat) {
        extra = `${getChatRoomSubtitle(report, policy, inputs.conciergeReportID, inputs.translate, true, isArchived) ?? ''}${report.policyName ?? ''}`;
    } else if (isGroup) {
        extra = details.map((detail) => [detail.displayName, detail.login].filter(Boolean).join(' ')).join(' ');
    }

    return {
        row: {
            kind: 'report',
            id: report.reportID,
            searchText: buildReportSearchText(report, text, login, extra),
            orderKey: `${isSelfDMReport ? 1 : 0}_${isArchived ? 0 : 1}_${report.lastVisibleActionCreated ?? ''}`,
            isHidden: isReportHiddenFromRouter(report, isThread, isArchived, inputs.currentUserAccountID),
        },
        dmAccountID: accountIDs.length <= 1 && isOneOnOneChat(report, inputs.currentUserAccountID) ? accountIDs.at(0) : undefined,
    };
}

/** Builds the index row of one contact with the same text its shell would carry. */
function buildContactIndexRow(detail: PersonalDetails, hasDMReport: boolean, inputs: SearchOptionsIndexInputs): OptionIndexRow {
    const accountID = detail.accountID ?? CONST.DEFAULT_NUMBER_ID;
    const text = getPersonalDetailOptionText({accountID, hasReport: hasDMReport, personalDetails: inputs.personalDetails, login: detail.login, translate: inputs.translate});
    const terms = getPersonalDetailSearchTerms({text, displayName: detail.displayName, login: detail.login, accountID, participantsList: [detail]}, inputs.currentUserAccountID);
    return {
        kind: 'contact',
        id: String(accountID),
        searchText: normalizeSearchText([...terms, text].join(' ')),
        orderKey: text.toLowerCase(),
        isHidden: false,
    };
}

export {buildReportIndexEntry, buildContactIndexRow, normalizeSearchText};
export type {ReportIndexEntry};
