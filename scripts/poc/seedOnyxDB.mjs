/**
 * Lazy-Onyx POC — synthetic Onyx database generator.
 *
 * Builds a standalone `OnyxDB` SQLite file with the exact schema the app's SQLiteProvider creates,
 * filled with SYNTHETIC data only (no dumps, no real account data, no PII). The file is meant to be
 * dropped into a simulator/emulator app container so cold-start measurements run against a
 * realistically large local store.
 *
 * The size distribution mirrors real accounts: report actions dominate (one record per report
 * holding that report's whole action map), then transactions, then reports themselves.
 *
 * Usage:
 *   node scripts/poc/seedOnyxDB.mjs --out /tmp/OnyxDB --target-mb 100 [--seed 1] [--account-id 12345]
 *                                   [--email poc@example.com] [--focus-report-actions 800]
 *
 * Deterministic: same --seed and --target-mb produce the same database.
 */

import {existsSync, rmSync, statSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {parseArgs} from 'node:util';

const {values: args} = parseArgs({
    options: {
        out: {type: 'string', default: '/tmp/OnyxDB'},
        'target-mb': {type: 'string', default: '100'},
        seed: {type: 'string', default: '1'},
        'account-id': {type: 'string', default: '20250001'},
        email: {type: 'string', default: 'poc.seed@example.com'},
        'focus-report-actions': {type: 'string', default: '800'},
        'people-count': {type: 'string', default: '2500'},
        'policy-count': {type: 'string', default: '25'},
        // Steady state (default) seeds the derived outputs a returning user already has on disk.
        // --no-derived produces the post-upgrade scenario instead: no projection, no version stamps,
        // so the scoped materializers backfill everything on first boot.
        'no-derived': {type: 'boolean', default: false},
    },
});

const OUT_PATH = args.out;
const TARGET_BYTES = Number(args['target-mb']) * 1024 * 1024;
const ACCOUNT_ID = Number(args['account-id']);
const EMAIL = args.email;
const FOCUS_REPORT_ACTIONS = Number(args['focus-report-actions']);
const PEOPLE_COUNT = Number(args['people-count']);
const POLICY_COUNT = Number(args['policy-count']);

// ── deterministic PRNG (mulberry32) ────────────────────────────────────────────
let prngState = Number(args.seed) >>> 0;
function random() {
    prngState = (prngState + 0x6d2b79f5) >>> 0;
    let t = prngState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const randInt = (min, max) => min + Math.floor(random() * (max - min + 1));
const pick = (list) => list[randInt(0, list.length - 1)];

// ── synthetic text ─────────────────────────────────────────────────────────────
const WORDS =
    `budget receipt invoice mileage lodging client onboarding retro sprint vendor renewal audit reconcile approve reject submit reimburse expense policy category tag import export sync error retry draft comment thread mention attach photo scan card feed statement subscription seat license domain member admin workspace room announce`.split(
        ' ',
    );
const FIRST_NAMES = `Ada Bo Cai Dee Eli Fay Gus Hal Ivy Jo Kit Lou Mae Ned Oli Pia Quin Ravi Sol Tam Uma Vic Wes Xia Yan Zed`.split(' ');
const LAST_NAMES = `Archer Brooks Chen Doyle Ellis Fischer Grant Hayes Iqbal Jensen Keller Lopez Moreau Novak Oyelaran Park Quinn Reyes Santos Turner Ueda Vance Weiss Xu Yamada Zima`.split(
    ' ',
);
const MERCHANTS = `Airline Hotel Cafe Taxi Rail Fuel Office Cloud Hosting Catering Parking Toll Courier Software`.split(' ');
const CURRENCIES = ['USD', 'EUR', 'PLN', 'GBP'];

function sentence(wordCount) {
    const parts = [];
    for (let i = 0; i < wordCount; i++) {
        parts.push(pick(WORDS));
    }
    const text = parts.join(' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
}

// DB time format: CONST.DATE.FNS_DB_FORMAT_STRING = 'yyyy-MM-dd HH:mm:ss.SSS'
// Fixed epoch keeps the generator deterministic; timestamps walk backwards from it.
const EPOCH_MS = Date.parse('2026-08-01T12:00:00.000Z');
function dbTime(msAgo) {
    const d = new Date(EPOCH_MS - msAgo);
    const pad = (n, w = 2) => String(n).padStart(w, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${pad(d.getUTCMilliseconds(), 3)}`;
}

// ── record builders (shapes match src/types/onyx) ──────────────────────────────
const CHAT_TYPES = ['policyExpenseChat', 'policyRoom', 'policyAdmins', 'policyAnnounce', 'group', undefined, undefined, undefined];

function buildPerson(accountID, people) {
    return [{type: 'TEXT', style: 'strong', text: people.get(accountID)?.displayName ?? `User ${accountID}`}];
}

function buildComment(actionID, reportID, actorAccountID, msAgo, people) {
    const text = sentence(randInt(4, 40));
    const created = dbTime(msAgo);
    return {
        reportActionID: String(actionID),
        reportID: String(reportID),
        actionName: 'ADDCOMMENT',
        actorAccountID,
        person: buildPerson(actorAccountID, people),
        created,
        lastModified: created,
        message: [{type: 'COMMENT', html: `<p>${text}</p>`, text, isEdited: false, whisperedTo: []}],
        originalMessage: {html: `<p>${text}</p>`, lastModified: created, whisperedTo: []},
        avatar: `https://d2k5nsl2zxldvw.cloudfront.net/images/avatars/default-avatar_${randInt(1, 24)}.png`,
        automatic: false,
        shouldShow: true,
        isAttachmentOnly: false,
        isFirstItem: false,
        errors: {},
    };
}

function buildCreatedAction(reportID, msAgo, actorAccountID, people) {
    const created = dbTime(msAgo);
    return {
        reportActionID: `${reportID}0`,
        reportID: String(reportID),
        actionName: 'CREATED',
        actorAccountID,
        person: buildPerson(actorAccountID, people),
        created,
        lastModified: created,
        message: [{type: 'TEXT', style: 'strong', text: '__fake__'}],
        automatic: false,
        shouldShow: true,
    };
}

function main() {
    for (const suffix of ['', '-wal', '-shm', '-journal']) {
        const p = `${OUT_PATH}${suffix}`;
        if (existsSync(p)) {
            rmSync(p);
        }
    }

    const db = new DatabaseSync(OUT_PATH);
    // Exactly the schema SQLiteProvider.init() creates, so the app opens this file as its own.
    db.exec('CREATE TABLE IF NOT EXISTS keyvaluepairs (record_key TEXT NOT NULL PRIMARY KEY , valueJSON JSON NOT NULL) WITHOUT ROWID;');
    db.exec('PRAGMA journal_mode=DELETE;');

    const insert = db.prepare('REPLACE INTO keyvaluepairs (record_key, valueJSON) VALUES (?, ?);');
    const put = (key, value) => insert.run(key, JSON.stringify(value));

    // ── people ────────────────────────────────────────────────────────────────
    const people = new Map();
    people.set(ACCOUNT_ID, {
        accountID: ACCOUNT_ID,
        login: EMAIL,
        displayName: 'POC Seed User',
        firstName: 'POC',
        lastName: 'Seed',
        avatar: 'https://d2k5nsl2zxldvw.cloudfront.net/images/avatars/default-avatar_1.png',
        timezone: {automatic: true, selected: 'Europe/Warsaw'},
        pronouns: '',
        phoneNumber: '',
        validated: true,
    });
    for (let i = 0; i < PEOPLE_COUNT; i++) {
        const accountID = 30000000 + i;
        const first = pick(FIRST_NAMES);
        const last = pick(LAST_NAMES);
        people.set(accountID, {
            accountID,
            login: `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`,
            displayName: `${first} ${last}`,
            firstName: first,
            lastName: last,
            avatar: `https://d2k5nsl2zxldvw.cloudfront.net/images/avatars/default-avatar_${(i % 24) + 1}.png`,
            timezone: {automatic: true, selected: 'America/Los_Angeles'},
            pronouns: '',
            phoneNumber: '',
            validated: true,
        });
    }
    put('personalDetailsList', Object.fromEntries(people));

    // ── session / account singletons ──────────────────────────────────────────
    put('session', {
        authToken: 'poc-seeded-auth-token-not-a-real-credential',
        encryptedAuthToken: 'poc-seeded-encrypted-auth-token-not-a-real-credential',
        accountID: ACCOUNT_ID,
        email: EMAIL,
        authTokenType: 'normal',
    });
    put('credentials', {login: EMAIL, autoGeneratedLogin: '', autoGeneratedPassword: ''});
    put('account', {isLoading: false, requiresTwoFactorAuth: false, primaryLogin: EMAIL, validated: true});
    put('user', {isUsingExpensifyCard: false, shouldUseStagingServer: false, isDebugModeEnabled: false});
    put('betas', ['all']);
    put('nvp_priorityMode', 'default');
    put('nvp_preferredLocale', 'en');
    put('preferredTheme', 'dark');
    put('isLoadingApp', false);
    // hasLoadedApp gates the LHN skeleton (useAppLoadSkeletonState): true keeps the sidebar rendering
    // from local data even though the queued OpenApp never completes in the offline harness below.
    put('hasLoadedApp', true);
    put('isLoadingReportData', false);
    // Force-offline is what makes a synthetic session safe: no request leaves the device, so the seeded
    // auth token is never rejected by a real server — a 401 would sign the app out and Onyx.clear() would
    // wipe the whole seeded database mid-measurement. The local read path under measurement is unaffected:
    // openApp still runs its full client-side work (including the POC's hydrate(POLICY/REPORT)) before the
    // request is handed to the queue.
    put('network', {shouldForceOffline: true, shouldSimulatePoorConnection: false, shouldFailAllRequests: false});
    put('nvp_introSelected', {choice: '', isInviteOnboardingComplete: true});
    put('nvp_onboarding', {hasCompletedGuidedSetupFlow: true, isMergeAccountStepCompleted: true});
    put('userMetadata', {accountID: ACCOUNT_ID});
    put('nvp_lastPaymentMethod', {});
    put('countryCode', 'PL');
    put('nvp_tryNewDot', {classicRedirect: {dismissed: true}});
    // Home landing, pinned so runs are comparable (the app restores this path on cold start).
    put('lastVisitedPath', '/home');
    put('nvp_lastSelectedDistanceRates', {});

    // ── policies ──────────────────────────────────────────────────────────────
    const policyIDs = [];
    for (let p = 0; p < POLICY_COUNT; p++) {
        const policyID = `POC${String(p).padStart(14, '0')}`;
        policyIDs.push(policyID);
        const employeeList = {};
        const memberCount = randInt(3, 40);
        for (let m = 0; m < memberCount; m++) {
            const accountID = 30000000 + randInt(0, PEOPLE_COUNT - 1);
            employeeList[people.get(accountID).login] = {email: people.get(accountID).login, role: 'user', submitsTo: EMAIL, forwardsTo: ''};
        }
        employeeList[EMAIL] = {email: EMAIL, role: p % 3 === 0 ? 'admin' : 'user', submitsTo: '', forwardsTo: ''};
        put(`policy_${policyID}`, {
            id: policyID,
            name: `${pick(WORDS)} ${pick(WORDS)} workspace ${p}`,
            type: 'team',
            role: p % 3 === 0 ? 'admin' : 'user',
            owner: p % 3 === 0 ? EMAIL : people.get(30000000 + p).login,
            ownerAccountID: p % 3 === 0 ? ACCOUNT_ID : 30000000 + p,
            outputCurrency: pick(CURRENCIES),
            isPolicyExpenseChatEnabled: true,
            areCategoriesEnabled: true,
            areTagsEnabled: p % 2 === 0,
            areDistanceRatesEnabled: false,
            approvalMode: 'BASIC',
            autoReporting: true,
            autoReportingFrequency: 'immediate',
            employeeList,
            pendingAction: null,
        });
        const categories = {};
        for (let c = 0; c < randInt(8, 60); c++) {
            const name = `${pick(WORDS)}-${c}`;
            categories[name] = {name, enabled: true, areCommentsRequired: false, 'GL Code': '', externalID: ''};
        }
        put(`policyCategories_${policyID}`, categories);
    }

    // ── reports + report actions + transactions ───────────────────────────────
    const pageSize = db.prepare('PRAGMA page_size;').get().page_size;
    const currentBytes = () => db.prepare('PRAGMA page_count;').get().page_count * pageSize;

    let reportSeq = 1000000;
    let actionSeq = 5000000;
    let transactionSeq = 7000000;
    let reportCount = 0;
    let actionCount = 0;
    let transactionCount = 0;

    // The chat we deep-measure: deterministic ID, long action list (chat-landing measurement).
    const focusReportID = String(reportSeq);

    // Collected while generating, written out as the derived outputs a returning user already has.
    const derivedRows = [];
    const visibleActionsByReportID = {};

    db.exec('BEGIN');
    while (currentBytes() < TARGET_BYTES) {
        for (let batch = 0; batch < 25; batch++) {
            const reportID = String(reportSeq++);
            const isFocus = reportID === focusReportID;
            const chatType = isFocus ? undefined : pick(CHAT_TYPES);
            const policyID = chatType && chatType.startsWith('policy') ? pick(policyIDs) : undefined;
            const otherAccountID = 30000000 + randInt(0, PEOPLE_COUNT - 1);
            const ageMs = randInt(0, 400) * 24 * 3600 * 1000 + randInt(0, 86_400_000);

            // Heavy tail: most chats are short, a few are huge — that is what real accounts look like.
            const roll = random();
            let actionsInReport = isFocus ? FOCUS_REPORT_ACTIONS : roll < 0.6 ? randInt(3, 25) : roll < 0.9 ? randInt(25, 120) : randInt(120, 900);

            const participants = {
                [ACCOUNT_ID]: {notificationPreference: 'always'},
                [otherAccountID]: {notificationPreference: 'always'},
            };
            if (chatType === 'group') {
                for (let g = 0; g < randInt(2, 8); g++) {
                    participants[30000000 + randInt(0, PEOPLE_COUNT - 1)] = {notificationPreference: 'always'};
                }
            }

            const actions = {};
            let newestCreated = dbTime(ageMs);
            let newestText = '';
            let newestActor = otherAccountID;
            const createdAction = buildCreatedAction(reportID, ageMs + actionsInReport * 60_000, otherAccountID, people);
            actions[createdAction.reportActionID] = createdAction;
            for (let a = 0; a < actionsInReport; a++) {
                const actorAccountID = random() < 0.45 ? ACCOUNT_ID : otherAccountID;
                const msAgo = ageMs + (actionsInReport - a) * 60_000;
                const action = buildComment(actionSeq++, reportID, actorAccountID, msAgo, people);
                actions[action.reportActionID] = action;
                newestCreated = action.created;
                newestText = action.message[0].text;
                newestActor = actorAccountID;
                actionCount++;
            }
            put(`reportActions_${reportID}`, actions);
            actionCount++; // CREATED

            const isArchived = !isFocus && random() < 0.08;
            const reportName = chatType === 'policyAdmins' ? '#admins' : chatType === 'policyAnnounce' ? '#announce' : sentence(randInt(2, 5));
            const isUnread = random() < 0.25;
            const lastReadTime = isUnread ? dbTime(ageMs + 3_600_000) : newestCreated;
            const isPinned = random() < 0.04;
            put(`report_${reportID}`, {
                reportID,
                reportName,
                type: 'chat',
                chatType,
                policyID,
                ownerAccountID: chatType === 'policyExpenseChat' ? ACCOUNT_ID : otherAccountID,
                isOwnPolicyExpenseChat: chatType === 'policyExpenseChat',
                participants,
                currency: pick(CURRENCIES),
                lastVisibleActionCreated: newestCreated,
                lastMessageText: newestText,
                lastMessageHtml: `<p>${newestText}</p>`,
                lastActorAccountID: newestActor,
                lastReadTime,
                lastVisibleActionLastModified: newestCreated,
                isPinned,
                writeCapability: 'all',
                visibility: chatType && chatType.startsWith('policy') ? 'restricted' : undefined,
                description: '',
                stateNum: 0,
                statusNum: 0,
                hasOutstandingChildRequest: false,
                everyoneElseHasSameNotificationPreference: true,
            });
            put(`reportNameValuePairs_${reportID}`, isArchived ? {private_isArchived: dbTime(ageMs)} : {});
            put(`reportMetadata_${reportID}`, {isLoadingInitialReportActions: false, isLoadingOlderReportActions: false, isLoadingNewerReportActions: false});
            reportCount++;
            // Every seeded ADDCOMMENT is visible (non-empty message, shouldShow, not deleted), which is
            // what visibleReportActions would compute for this data.
            visibleActionsByReportID[reportID] = Object.fromEntries(Object.keys(actions).map((actionID) => [actionID, true]));
            derivedRows.push({
                reportID,
                reportName,
                lastVisibleActionCreated: newestCreated,
                isPinned: isPinned ? 1 : 0,
                isArchived: isArchived ? 1 : 0,
                // A chat with the current user as participant shows in default mode unless archived;
                // focus (#gsd) mode keeps only unread/pinned rows. This mirrors
                // SidebarUtils.shouldDisplayReportInLHN for the seeded shapes without re-implementing it.
                lhnEligibleDefault: isArchived ? 0 : 1,
                lhnEligibleFocus: !isArchived && (isUnread || isPinned) ? 1 : 0,
                requiresAttention: isUnread ? 1 : 0,
            });

            // Expense children for workspace chats: an expense report + its transactions.
            if (chatType === 'policyExpenseChat' && random() < 0.7) {
                const expenseReportID = String(reportSeq++);
                const txnCount = randInt(1, 12);
                let total = 0;
                const expenseActions = {};
                const expenseCreated = buildCreatedAction(expenseReportID, ageMs, ACCOUNT_ID, people);
                expenseActions[expenseCreated.reportActionID] = expenseCreated;
                for (let t = 0; t < txnCount; t++) {
                    const transactionID = String(transactionSeq++);
                    const amount = randInt(500, 250000);
                    total += amount;
                    put(`transactions_${transactionID}`, {
                        transactionID,
                        reportID: expenseReportID,
                        amount: -amount,
                        currency: pick(CURRENCIES),
                        merchant: `${pick(MERCHANTS)} ${randInt(1, 99)}`,
                        created: dbTime(ageMs + t * 3_600_000),
                        category: `${pick(WORDS)}-${randInt(0, 20)}`,
                        tag: '',
                        comment: {comment: random() < 0.3 ? sentence(randInt(3, 12)) : ''},
                        billable: false,
                        reimbursable: true,
                        receipt: random() < 0.5 ? {receiptID: Number(transactionID), source: 'https://www.expensify.com/receipts/poc.jpg', state: 'SCANCOMPLETE'} : {},
                        modifiedAmount: 0,
                        modifiedCreated: '',
                        modifiedCurrency: '',
                        modifiedMerchant: '',
                        cardID: 0,
                        managedCard: false,
                        hasEReceipt: false,
                        participants: [{accountID: ACCOUNT_ID}],
                    });
                    transactionCount++;
                    if (random() < 0.12) {
                        put(`transactionViolations_${transactionID}`, [{name: 'missingCategory', type: 'violation', showInReview: true}]);
                    }
                    const previewAction = buildComment(actionSeq++, expenseReportID, ACCOUNT_ID, ageMs + t * 3_600_000, people);
                    expenseActions[previewAction.reportActionID] = previewAction;
                    actionCount++;
                }
                put(`reportActions_${expenseReportID}`, expenseActions);
                put(`report_${expenseReportID}`, {
                    reportID: expenseReportID,
                    reportName: 'Expense Report',
                    type: 'expense',
                    policyID,
                    parentReportID: reportID,
                    parentReportActionID: `${reportID}0`,
                    chatReportID: reportID,
                    ownerAccountID: ACCOUNT_ID,
                    managerID: 30000000 + randInt(0, PEOPLE_COUNT - 1),
                    currency: pick(CURRENCIES),
                    total: -total,
                    unheldTotal: -total,
                    nonReimbursableTotal: 0,
                    stateNum: randInt(0, 2),
                    statusNum: randInt(0, 2),
                    lastVisibleActionCreated: dbTime(ageMs),
                    lastMessageText: 'Expense',
                    participants: {[ACCOUNT_ID]: {notificationPreference: 'always'}},
                });
                put(`reportNameValuePairs_${expenseReportID}`, {});
                reportCount++;
                visibleActionsByReportID[expenseReportID] = Object.fromEntries(Object.keys(expenseActions).map((actionID) => [actionID, true]));
                // Expense reports are surfaced through their parent chat, never as their own LHN row —
                // the projection still carries an entry for them with both eligibility flags at 0.
                derivedRows.push({
                    reportID: expenseReportID,
                    reportName: 'Expense Report',
                    lastVisibleActionCreated: dbTime(ageMs),
                    isPinned: 0,
                    isArchived: 0,
                    lhnEligibleDefault: 0,
                    lhnEligibleFocus: 0,
                    requiresAttention: 0,
                });
            }
        }
        db.exec('COMMIT');
        db.exec('BEGIN');
    }
    db.exec('COMMIT');

    // Give the focus chat a draft so the "restore draft" path has work to do.
    put(`reportDraftComment_${focusReportID}`, sentence(12));

    // ── derived outputs (steady state) ────────────────────────────────────────
    // Without these, the first boot on this database is the POST-UPGRADE scenario: the scoped
    // materializers find no version stamp, sweep all entries in the background, and the lazy LHN has
    // nothing to query until they finish. That is a real (and separately interesting) cost, but it is
    // not what a returning user pays — so seed the steady state by default and keep the migration
    // scenario behind --no-derived.
    if (!args['no-derived']) {
        db.exec('BEGIN');
        const attributesBlob = {};
        for (const row of derivedRows) {
            attributesBlob[row.reportID] = {
                reportName: row.reportName,
                isEmpty: false,
                brickRoadStatus: undefined,
                requiresAttention: row.requiresAttention === 1,
            };
            put(`derivedReportAttributes_${row.reportID}`, {
                reportName: row.reportName,
                sortName: row.reportName.toLowerCase(),
                lhnEligibleDefault: row.lhnEligibleDefault,
                lhnEligibleFocus: row.lhnEligibleFocus,
                isPinned: row.isPinned,
                isArchived: row.isArchived,
                lastVisibleActionCreated: row.lastVisibleActionCreated,
                brickRoadStatus: undefined,
                requiresAttention: row.requiresAttention,
            });
        }
        put('reportAttributes', {reports: attributesBlob, locale: 'en'});
        put('visibleReportActions', visibleActionsByReportID);
        // Version stamps must match the specs' current versions, otherwise the materializers backfill
        // on start regardless of the seeded outputs. sortedReportActions is RAM-only (isOutputPersisted
        // false) and deliberately carries no stamp — it sweeps every session by design.
        put('derivedScopedMeta', {reportAttributes: {version: 1}, visibleReportActions: {version: 1}});
        db.exec('COMMIT');
    }

    db.exec('PRAGMA optimize;');
    db.close();

    const sizeMB = statSync(OUT_PATH).size / 1024 / 1024;
    const summary = {
        out: OUT_PATH,
        sizeMB: Number(sizeMB.toFixed(2)),
        reports: reportCount,
        reportActions: actionCount,
        transactions: transactionCount,
        policies: POLICY_COUNT,
        people: PEOPLE_COUNT,
        accountID: ACCOUNT_ID,
        email: EMAIL,
        focusReportID,
        focusReportActions: FOCUS_REPORT_ACTIONS,
        derivedOutputs: args['no-derived'] ? 'absent (post-upgrade scenario)' : `seeded (${derivedRows.length} projection entries, stamped v1)`,
    };
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main();
