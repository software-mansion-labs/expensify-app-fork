import {buildParticipantsFromAccountIDs} from '@libs/ReportUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Report, ReportNameValuePairs} from '@src/types/onyx';
import type {ReportAttributesDerivedValue} from '@src/types/onyx/DerivedValues';

type LhnDataset = {
    reports: Record<string, Report>;
    reportAttributes: ReportAttributesDerivedValue['reports'];
    reportNameValuePairs: Record<string, ReportNameValuePairs>;
    /** Keyed the way Onyx stores drafts, so a dataset can be loaded with `mergeCollection`. */
    draftComments: Record<string, string>;
};

type LhnDatasetOptions = {
    reportCount: number;
    currentUserAccountID: number;
    /** How many other accounts the chats are shared with. */
    contactCount?: number;
};

/** Every nth report lands in a bucket or a tab, so all five groups and both Inbox tabs are populated. */
const PINNED_EVERY = 11;
const ATTENTION_EVERY = 7;
const DRAFT_EVERY = 13;
const ARCHIVED_EVERY = 17;
const UNREAD_EVERY = 5;
/** A few reports have never had a visible action, which is where today's comparator stops being a total order. */
const NO_ACTION_EVERY = 97;

function buildLastVisibleActionCreated(index: number): string {
    const minutes = (index * 7919) % 100_000;
    const epochMs = Date.UTC(2024, 0, 1, 0, 0, 0) + minutes * 60_000;
    const iso = new Date(epochMs).toISOString();
    return `${iso.slice(0, 10)} ${iso.slice(11, 23)}`;
}

/**
 * A deterministic account for the LHN order POC: chats the current user participates in, spread over the five LHN
 * groups, with unread and to-do reports for the two Inbox tabs. Display names are unique so the order does not
 * depend on how ties are broken, which the parity tests cover separately.
 */
function buildLhnDataset({reportCount, currentUserAccountID, contactCount = 500}: LhnDatasetOptions): LhnDataset {
    const reports: Record<string, Report> = {};
    const reportAttributes: ReportAttributesDerivedValue['reports'] = {};
    const reportNameValuePairs: Record<string, ReportNameValuePairs> = {};
    const draftComments: Record<string, string> = {};

    for (let index = 1; index <= reportCount; index++) {
        const reportID = index.toString();
        const hasNoAction = index % NO_ACTION_EVERY === 0;
        const lastVisibleActionCreated = buildLastVisibleActionCreated(index);
        const isUnread = index % UNREAD_EVERY === 0 && !hasNoAction;
        const reportName = `Chat ${index.toString().padStart(6, '0')}`;

        const report: Report = {
            reportID,
            reportName,
            type: CONST.REPORT.TYPE.CHAT,
            policyID: ((index % 20) + 1).toString(),
            currency: 'USD',
            ownerAccountID: currentUserAccountID,
            isPinned: index % PINNED_EVERY === 0,
            isOwnPolicyExpenseChat: false,
            participants: buildParticipantsFromAccountIDs([currentUserAccountID, (index % Math.max(contactCount - 1, 1)) + 2]),
            lastVisibleActionCreated: hasNoAction ? undefined : lastVisibleActionCreated,
            lastActorAccountID: hasNoAction ? undefined : (index % Math.max(contactCount - 1, 1)) + 2,
            lastReadTime: isUnread ? buildLastVisibleActionCreated(0) : lastVisibleActionCreated,
            lastMessageText: hasNoAction ? undefined : `message ${index}`,
            statusNum: 0,
            stateNum: 0,
        };

        reports[`${ONYXKEYS.COLLECTION.REPORT}${reportID}`] = report;
        reportAttributes[reportID] = {
            reportName,
            isEmpty: false,
            brickRoadStatus: undefined,
            requiresAttention: index % ATTENTION_EVERY === 0,
            reportErrors: {},
        };
        if (index % ARCHIVED_EVERY === 0) {
            reportNameValuePairs[`${ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS}${reportID}`] = {private_isArchived: lastVisibleActionCreated};
        }
        if (index % DRAFT_EVERY === 0) {
            draftComments[`${ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT}${reportID}`] = `draft ${index}`;
        }
    }

    return {reports, reportAttributes, reportNameValuePairs, draftComments};
}

export default buildLhnDataset;
export type {LhnDataset};
