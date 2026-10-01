import {formatPhoneNumber} from '@libs/LocalePhoneNumber';
import {reportSortComparator} from '@libs/OptionsListUtils';
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

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {PersonalDetails, Report} from '@src/types/onyx';

import {Str} from 'expensify-common';

import type {OptionIndexRow, SearchOptionsIndexInputs} from './types';

import normalizeSearchText from './normalizeSearchText';

/** Chat types the router never hides, whatever the current user's notification preference for them is. */
const NEVER_HIDDEN_CHAT_TYPES = new Set<string>([
    CONST.REPORT.CHAT_TYPE.SELF_DM,
    CONST.REPORT.CHAT_TYPE.POLICY_ADMINS,
    CONST.REPORT.CHAT_TYPE.POLICY_ROOM,
    CONST.REPORT.CHAT_TYPE.POLICY_EXPENSE_CHAT,
    CONST.REPORT.CHAT_TYPE.GROUP,
]);

/** Report types that the router never renders in its options list. */
const UNSUPPORTED_REPORT_TYPES = new Set<string>(Object.values(CONST.REPORT.UNSUPPORTED_TYPE));

/** What a report row is, plus the one thing about it the index has to remember outside the row. */
type ReportIndexEntry = {
    row: OptionIndexRow;

    /** The account this report is the 1:1 DM of, when it is one. A contact borrows its DM's report for display. */
    dmAccountID: number | undefined;
};

/** The shape of a report the row builder needs, read once and passed to every rule below. */
type ReportFacts = {
    isThread: boolean;
    isRoom: boolean;
    isGroup: boolean;
    isExpenseChat: boolean;
    isSelfDMReport: boolean;
    isArchived: boolean;
    participants: PersonalDetails[];

    /** The login of the only other participant, which the router matches on for a 1:1 chat and nowhere else. */
    login: string | undefined;
};

function readReportFacts(report: Report, participantAccountIDs: number[], inputs: SearchOptionsIndexInputs): ReportFacts {
    const isRoom = isChatRoom(report);
    const isGroup = isGroupChat(report);
    const isExpenseChat = isPolicyExpenseChat(report);
    const participants = participantAccountIDs.map((accountID) => inputs.personalDetails?.[accountID]).filter((detail): detail is PersonalDetails => !!detail);
    const hasMultipleParticipants = participants.length > 1 || isRoom || isExpenseChat || isGroup;

    return {
        isRoom,
        isGroup,
        isExpenseChat,
        isThread: isChatThread(report),
        isSelfDMReport: isSelfDM(report),
        isArchived: !!inputs.privateIsArchivedMap[`${ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS}${report.reportID}`],
        participants,
        login: hasMultipleParticipants ? undefined : participants.at(0)?.login,
    };
}

/** The title the option would carry, which is the report name for everything but a self DM. */
function getReportTitle(report: Report, facts: ReportFacts, inputs: SearchOptionsIndexInputs): string {
    const reportName = getReportName(report, inputs.reportAttributes?.[report.reportID]?.reportName);
    if (reportName || !facts.isSelfDMReport) {
        return reportName;
    }
    return getDisplayNameForParticipant({
        accountID: report.ownerAccountID,
        shouldAddCurrentUserPostfix: true,
        personalDetailsData: inputs.personalDetails ?? undefined,
        formatPhoneNumber,
        youTranslation: inputs.translate('common.you'),
    });
}

/** The text the router appends to the title for the kinds of report that show a second line. */
function getReportSubtitleText(report: Report, facts: ReportFacts, inputs: SearchOptionsIndexInputs): string {
    const policy = inputs.policies?.[`${ONYXKEYS.COLLECTION.POLICY}${report.policyID}`];
    const chatRoomSubtitle = () => getChatRoomSubtitle(report, policy, inputs.conciergeReportID, inputs.translate, inputs.rules, true, facts.isArchived) ?? '';

    if (facts.isThread) {
        return isMoneyRequest(report) || isMoneyRequestReport(report) ? inputs.translate('iou.expense') : inputs.translate('threads.thread');
    }
    if (facts.isRoom) {
        return chatRoomSubtitle();
    }
    if (facts.isExpenseChat) {
        return `${chatRoomSubtitle()}${report.policyName ?? ''}`;
    }
    if (facts.isGroup) {
        return facts.participants.map((participant) => [participant.displayName, participant.login].filter(Boolean).join(' ')).join(' ');
    }
    return '';
}

/**
 * Everything a typed term may match on. It is a superset of the text `getValidOptions` concatenates: the same
 * fields in the same order, plus the variants the canonical `filterReports` matcher derives from them, so a term
 * that only the canonical matcher would find still selects this row.
 */
function buildReportSearchText(title: string, subtitle: string, login: string | undefined): string {
    const canonicalVariants = [title.replaceAll(/['-]/g, ''), login ? login.replace(CONST.EMAIL_SEARCH_REGEX, '') : ''];
    return normalizeSearchText([`${title}${login ?? ''}${subtitle}`, ...canonicalVariants].join(' '));
}

/** The `excludeHidden` rule of `getValidOptions`, decided on the report instead of on its built option. */
function isReportHidden(report: Report, facts: ReportFacts, currentUserAccountID: number): boolean {
    if (facts.isThread) {
        return getReportNotificationPreference(report, currentUserAccountID) === CONST.REPORT.NOTIFICATION_PREFERENCE.HIDDEN;
    }
    if (isTaskReport(report) || facts.isArchived || (report.chatType !== undefined && NEVER_HIDDEN_CHAT_TYPES.has(report.chatType))) {
        return false;
    }
    const participant = report.participants?.[currentUserAccountID];
    return !!participant && isHiddenForCurrentUser(participant.notificationPreference);
}

/**
 * Whether this is the thread of the only expense of an expense or invoice report, which `isValidReport` drops
 * because its parent report already shows that expense. Read from the parent's derived attributes, which name
 * that thread. An IOU parent is left to the pass over the candidates: its single thread can also come from
 * sending money in a DM, which today's path keeps, and only the parent report action tells the two apart.
 */
function isOneTransactionThreadOfExpenseReport(report: Report, inputs: SearchOptionsIndexInputs): boolean {
    const parentReport = report.parentReportID ? inputs.reports?.[`${ONYXKEYS.COLLECTION.REPORT}${report.parentReportID}`] : undefined;
    if (parentReport?.type !== CONST.REPORT.TYPE.EXPENSE && parentReport?.type !== CONST.REPORT.TYPE.INVOICE) {
        return false;
    }
    return inputs.reportAttributes?.[parentReport.reportID]?.oneTransactionThreadReportID === report.reportID;
}

/**
 * Of everything `isValidReport` rejects a report for, whatever the snapshots alone decide is decided here, so those
 * reports are never selected as candidates and never use up the bounded window a query evaluates: hidden
 * preferences, system/notifications logins, domain emails, unsupported types, not-found errors, reports with no
 * name yet (nothing to render), and one-transaction threads. What needs more than the snapshots (the focused
 * report, report actions, drafts) stays in the pass over the candidates. Unlike that pass, this ignores which
 * report is focused, so a focused report rejected here is not offered either.
 */
function isReportSelectable(report: Report, facts: ReportFacts, inputs: SearchOptionsIndexInputs): boolean {
    if (isReportHidden(report, facts, inputs.currentUserAccountID)) {
        return false;
    }
    if (report.reportName === undefined) {
        return false;
    }
    if (isOneTransactionThreadOfExpenseReport(report, inputs)) {
        return false;
    }
    if (facts.login === CONST.EMAIL.NOTIFICATIONS) {
        return false;
    }
    if (report.type && UNSUPPORTED_REPORT_TYPES.has(report.type)) {
        return false;
    }
    if (facts.login && Str.isDomainEmail(facts.login)) {
        return false;
    }
    if (report.errorFields?.notFound) {
        return false;
    }
    return true;
}

/**
 * Builds the index row of one report, or nothing when the report has no option at all, which is the same pair of
 * checks `processReport` opens with.
 */
function buildReportIndexRow(report: Report, inputs: SearchOptionsIndexInputs): ReportIndexEntry | undefined {
    if (!report.reportID || !report.type) {
        return undefined;
    }
    // The participants are read from the inputs rather than from the module-level Onyx mirror `processReport`
    // falls back to, so a row is always derived from the snapshot the index was fed.
    const participantAccountIDs = getParticipantsAccountIDsForDisplay(report, false, false, false, undefined, inputs.personalDetails);
    const facts = readReportFacts(report, participantAccountIDs, inputs);
    if (participantAccountIDs.length === 0 && !facts.isRoom) {
        return undefined;
    }

    const title = getReportTitle(report, facts, inputs);

    return {
        row: {
            id: report.reportID,
            searchText: buildReportSearchText(title, getReportSubtitleText(report, facts, inputs), facts.login),
            // The key `recentReportComparator` builds from the option, so the index ranks reports as the list does.
            orderKey: reportSortComparator(report, inputs.privateIsArchivedMap),
            isSelectable: isReportSelectable(report, facts, inputs),
        },
        dmAccountID: participantAccountIDs.length <= 1 && isOneOnOneChat(report, inputs.currentUserAccountID) ? participantAccountIDs.at(0) : undefined,
    };
}

export default buildReportIndexRow;
