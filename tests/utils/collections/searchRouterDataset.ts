import type {PrivateIsArchivedMap} from '@hooks/usePrivateIsArchivedMap';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {PersonalDetails, PersonalDetailsList, Policy, Report, ReportAttributesDerivedValue, ReportNameValuePairs} from '@src/types/onyx';
import type {Participants} from '@src/types/onyx/Report';

/**
 * A deterministic account shaped like the SearchRouter sees it: DMs, group chats, workspace chats, rooms, expense
 * reports and threads, every report with participants (a report without them never enters the option list), a
 * share of archived and hidden chats, and a searchable token in a known share of names.
 */
type KeyedCollection<TPrefix extends string, TValue> = Record<`${TPrefix}${string}`, TValue>;

type SearchRouterDataset = {
    reports: KeyedCollection<typeof ONYXKEYS.COLLECTION.REPORT, Report>;
    personalDetails: PersonalDetailsList;
    reportAttributes: ReportAttributesDerivedValue['reports'];
    policies: KeyedCollection<typeof ONYXKEYS.COLLECTION.POLICY, Policy>;
    reportNameValuePairs: KeyedCollection<typeof ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS, ReportNameValuePairs>;
    privateIsArchivedMap: PrivateIsArchivedMap;
};

type SearchRouterDatasetOptions = {
    reportCount: number;
    contactCount: number;
    currentUserAccountID: number;
    /** Every N-th report and contact carries the token in its name. */
    tokenEvery?: number;
    token?: string;
};

const POLICY_COUNT = 20;
const ARCHIVED_EVERY = 13;
const HIDDEN_EVERY = 17;
const FIRST_CONTACT_ACCOUNT_ID = 2;
const FIRST_CREATED_AT = Date.UTC(2024, 0, 1, 9, 0, 0);

function formatCreated(epochMs: number): string {
    const iso = new Date(epochMs).toISOString();
    return `${iso.slice(0, 10)} ${iso.slice(11, 23)}`;
}

function participantsOf(accountIDs: number[], hiddenAccountID: number | undefined): Participants {
    const participants: Participants = {};
    for (const accountID of accountIDs) {
        participants[accountID] = {notificationPreference: accountID === hiddenAccountID ? CONST.REPORT.NOTIFICATION_PREFERENCE.HIDDEN : CONST.REPORT.NOTIFICATION_PREFERENCE.ALWAYS};
    }
    return participants;
}

function buildSearchRouterDataset({reportCount, contactCount, currentUserAccountID, tokenEvery = 50, token = 'Zephyr'}: SearchRouterDatasetOptions): SearchRouterDataset {
    const personalDetails: PersonalDetailsList = {};
    const currentUser: PersonalDetails = {accountID: currentUserAccountID, login: 'me@example.com', displayName: 'Current User', firstName: 'Current', lastName: 'User'};
    personalDetails[currentUserAccountID] = currentUser;
    const contactIDs: number[] = [];
    for (let index = 0; index < contactCount; index++) {
        const accountID = FIRST_CONTACT_ACCOUNT_ID + index;
        contactIDs.push(accountID);
        const hasToken = index % Math.floor(tokenEvery / 1.25) === 0;
        personalDetails[accountID] = {
            accountID,
            login: `user${index}@example.com`,
            displayName: hasToken ? `${token} Person ${index}` : `Person ${index}`,
            firstName: hasToken ? token : 'Person',
            lastName: String(index),
        };
    }

    const policies: SearchRouterDataset['policies'] = {};
    for (let index = 0; index < POLICY_COUNT; index++) {
        const id = `policy${index}`;
        policies[`${ONYXKEYS.COLLECTION.POLICY}${id}`] = {
            id,
            name: `Workspace ${index}`,
            role: CONST.POLICY.ROLE.ADMIN,
            type: CONST.POLICY.TYPE.TEAM,
            owner: 'owner@example.com',
            outputCurrency: 'USD',
        };
    }

    const reports: SearchRouterDataset['reports'] = {};
    const reportAttributes: ReportAttributesDerivedValue['reports'] = {};
    const reportNameValuePairs: SearchRouterDataset['reportNameValuePairs'] = {};
    const privateIsArchivedMap: Record<string, boolean> = {};

    // DMs take contacts in order so each contact has one DM while contacts last; other report kinds reuse contacts freely.
    let nextDMContact = 0;
    const contactAt = (index: number) => contactIDs.at(index % contactIDs.length) ?? currentUserAccountID;
    const dmContact = () => {
        const accountID = contactIDs.at(nextDMContact % contactIDs.length) ?? currentUserAccountID;
        nextDMContact += 1;
        return accountID;
    };

    for (let index = 0; index < reportCount; index++) {
        const reportID = String(1000 + index);
        const hasToken = index % tokenEvery === 0;
        const hiddenAccountID = index % HIDDEN_EVERY === 0 ? currentUserAccountID : undefined;
        const policyID = `policy${index % POLICY_COUNT}`;
        const contactID = index % 10 < 5 ? dmContact() : contactAt(index);
        const base: Report = {
            reportID,
            type: CONST.REPORT.TYPE.CHAT,
            lastVisibleActionCreated: formatCreated(FIRST_CREATED_AT + ((index * 7919) % 100_000) * 60_000),
            ownerAccountID: currentUserAccountID,
            participants: participantsOf([currentUserAccountID, contactID], hiddenAccountID),
            reportName: '',
        };
        let report: Report = base;
        let reportName = hasToken ? `${token} Chat ${index}` : `Chat ${index}`;

        switch (index % 10) {
            case 5:
                report = {...base, chatType: CONST.REPORT.CHAT_TYPE.GROUP, participants: participantsOf([currentUserAccountID, contactID, contactAt(index + 1)], hiddenAccountID)};
                reportName = hasToken ? `${token} Group ${index}` : `Group ${index}`;
                break;
            case 6:
                report = {...base, chatType: CONST.REPORT.CHAT_TYPE.POLICY_EXPENSE_CHAT, policyID, policyName: `Workspace ${index % POLICY_COUNT}`, isOwnPolicyExpenseChat: true};
                reportName = hasToken ? `${token} Workspace chat ${index}` : `Workspace chat ${index}`;
                break;
            case 7:
                report = {...base, chatType: CONST.REPORT.CHAT_TYPE.POLICY_ROOM, policyID, participants: participantsOf([currentUserAccountID], hiddenAccountID)};
                reportName = hasToken ? `#${token.toLowerCase()}-room-${index}` : `#room-${index}`;
                break;
            case 8:
                report = {
                    ...base,
                    type: CONST.REPORT.TYPE.EXPENSE,
                    policyID,
                    parentReportID: String(1000 + ((index + 4) % reportCount)),
                    participants: participantsOf([currentUserAccountID], hiddenAccountID),
                };
                reportName = hasToken ? `${token} Expense report ${index}` : `Expense report ${index}`;
                break;
            case 9:
                report = {...base, parentReportID: String(1000 + ((index + 1) % reportCount)), parentReportActionID: String(500_000 + index)};
                reportName = hasToken ? `${token} Thread ${index}` : `Thread ${index}`;
                break;
            default:
                reportName = personalDetails[contactID]?.displayName ?? reportName;
                break;
        }

        reports[`${ONYXKEYS.COLLECTION.REPORT}${reportID}`] = report;
        reportAttributes[reportID] = {reportName, isEmpty: false, brickRoadStatus: undefined, requiresAttention: false, reportErrors: {}};
        if (index % ARCHIVED_EVERY === 0) {
            reportNameValuePairs[`${ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS}${reportID}`] = {private_isArchived: '2024-06-01 00:00:00.000'};
            privateIsArchivedMap[`${ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS}${reportID}`] = true;
        }
    }

    return {reports, personalDetails, reportAttributes, policies, reportNameValuePairs, privateIsArchivedMap};
}

export default buildSearchRouterDataset;
export type {SearchRouterDataset, SearchRouterDatasetOptions};
