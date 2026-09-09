/**
 * Realistic Onyx seeding for the SQLite-buffer project (v1+v2, 2026-09-09).
 *
 * v1 — realistic scale: collection sizes follow the real per-account distributions measured in
 * Sentry via the raw numeric span attributes from App PR #99068 (7d window, 2026-09-09):
 *   reports_count_raw          p50 43   p90 246   p99 1,603   max 50,002
 *   transactions_count_raw     p50 56   p90 613   p99 4,535   max 65,632
 *   personal_details_count_raw p50 40   p90 341   —           max 48,286
 *   policies_count_raw         p50 2    p90 4     —           max 5,786 (outlier; capped, see below)
 * Given a target report count, companion collection sizes are log-log interpolated between those
 * anchors (pairing distributions by percentile is an approximation — good enough for scale tests).
 *
 * v2 — realistic variety: a category mix that exercises the branches the LHN membership filter and
 * derived values actually take (workspace chats, money reports with linked transactions, threads,
 * archived/RNVP, drafts, hidden notification preferences, empty chats, selfDM/system/concierge),
 * with internal consistency: participants exist in personalDetailsList, transactions point at their
 * money report and sum into its total, threads point at real parent actions, expense reports point
 * at a REPORTPREVIEW action in their workspace chat, lastVisibleActionCreated matches the newest
 * seeded action. Deterministic under --rng-seed so off-vs-flip runs compare identical accounts.
 *
 * All data is written locally into IndexedDB (OnyxDB/keyvaluepairs); nothing reaches the server.
 * Synthetic ids live in the 9xxxxxxx range and are wiped before every run (size 0 = wipe only).
 */

// [reportsCount, companionCount] anchor pairs; log-log interpolated, clamped at the ends.
const COMPANION_ANCHORS = {
    transactions: [
        [43, 56],
        [246, 613],
        [1603, 4535],
        [50002, 60000], // pairing the two max values is an approximation
    ],
    personalDetails: [
        [43, 40],
        [246, 341],
        [50002, 48286],
    ],
    // policies max in prod is 5,786 but that is a domain outlier (guide/support accounts);
    // real workspaces per user stay single digits — cap the interpolation at 20.
    policies: [
        [43, 2],
        [246, 4],
        [50002, 20],
    ],
};

function interpolateLogLog(anchors, x) {
    if (x <= anchors[0][0]) {
        return Math.max(1, Math.round((anchors[0][1] * x) / anchors[0][0]));
    }
    const last = anchors[anchors.length - 1];
    for (let i = 1; i < anchors.length; i++) {
        const [x1, y1] = anchors[i - 1];
        const [x2, y2] = anchors[i];
        if (x <= x2) {
            const t = (Math.log(x) - Math.log(x1)) / (Math.log(x2) - Math.log(x1));
            return Math.round(Math.exp(Math.log(y1) + t * (Math.log(y2) - Math.log(y1))));
        }
    }
    return last[1];
}

function resolveCounts(reports) {
    return {
        reports,
        transactions: interpolateLogLog(COMPANION_ANCHORS.transactions, reports),
        personalDetails: interpolateLogLog(COMPANION_ANCHORS.personalDetails, reports),
        policies: Math.min(20, interpolateLogLog(COMPANION_ANCHORS.policies, reports)),
    };
}

// Category shares (of total reports); the remainder becomes plain 1:1 chats.
// Flag shares are overlaid on top of compatible categories.
const DEFAULT_MIX = {
    emptyChat: 0.1,
    group: 0.1,
    policyExpenseChat: 0.07,
    policyRoom: 0.05,
    expense: 0.08,
    iou: 0.04,
    task: 0.03,
    thread: 0.02,
    selfDM: 0.005,
    system: 0.005,
    // flags
    pinned: 0.01,
    draft: 0.03,
    archived: 0.05,
    unread: 0.1,
    hidden: 0.12,
    emptySubmittedExpense: 0.01,
};

// Runs inside the page. Self-contained; receives everything via the single cfg argument.
const SEED_REALISTIC_FN = `async (cfg) => {
    const DB = await new Promise((resolve, reject) => {
        const req = indexedDB.open('OnyxDB');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    const STORE = 'keyvaluepairs';
    const get = (key) => new Promise((resolve, reject) => {
        const req = DB.transaction(STORE).objectStore(STORE).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    const wipeRange = (lo, hi) => new Promise((resolve, reject) => {
        const txn = DB.transaction(STORE, 'readwrite');
        txn.objectStore(STORE).delete(IDBKeyRange.bound(lo, hi));
        txn.oncomplete = resolve;
        txn.onerror = () => reject(txn.error);
    });
    const putBatch = (pairs) => new Promise((resolve, reject) => {
        const txn = DB.transaction(STORE, 'readwrite');
        const store = txn.objectStore(STORE);
        for (const [key, value] of pairs) store.put(value, key);
        txn.oncomplete = resolve;
        txn.onerror = () => reject(txn.error);
    });

    // Deterministic RNG (mulberry32) so the same --rng-seed reproduces the same account.
    let rngState = cfg.rngSeed >>> 0;
    const rand = () => {
        rngState = (rngState + 0x6d2b79f5) >>> 0;
        let t = rngState;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const pick = (list) => list[Math.floor(rand() * list.length)];

    // 1. Wipe all synthetic ranges (ids live in 9xxxxxxx; policies use the same numeric range).
    for (const prefix of ['report_', 'reportActions_', 'transactions_', 'reportDraftComment_', 'reportNameValuePairs_', 'policy_']) {
        await wipeRange(prefix + '90000000', prefix + '99999999~');
    }
    if (cfg.reports === 0) return {written: 0, wiped: true};

    const session = await get('session');
    const selfAccountID = (session && session.accountID) || 1;
    const pad = (n, width) => String(n).padStart(width, '0');
    const now = Date.now();
    const toOnyxTs = (ms) => {
        const d = new Date(ms);
        return d.toISOString().slice(0, 19).replace('T', ' ') + '.' + pad(d.getMilliseconds(), 3);
    };
    // Heavy-tailed recency: most reports touched recently, a long tail up to ~1 year old.
    const ageMinutesFor = () => Math.min(Math.floor(-Math.log(1 - rand()) * 4 * 24 * 60), 370 * 24 * 60);

    let bytes = 0;
    let pairs = [];
    let written = 0;
    const push = (key, value) => {
        pairs.push([key, value]);
        bytes += JSON.stringify(value).length + key.length;
    };
    const flush = async () => {
        if (!pairs.length) return;
        await putBatch(pairs);
        written += pairs.length;
        pairs = [];
    };

    // 2. Personal details pool (participants are sampled from it, so every referenced id exists).
    const FAKE_BASE = 80000000;
    const personalDetails = (await get('personalDetailsList')) || {};
    for (let f = 0; f < cfg.personalDetails; f++) {
        const accountID = FAKE_BASE + f;
        personalDetails[accountID] = {
            accountID,
            login: 'fake' + f + '@example.com',
            displayName: 'Fake ' + ['Anna', 'Marek', 'Ola', 'Piotr', 'Kasia', 'Tomek', 'Zofia', 'Jan'][f % 8] + ' ' + f,
            firstName: 'Fake',
            lastName: 'User ' + f,
            avatar: '',
            pronouns: '',
            timezone: {automatic: true, selected: 'UTC'},
        };
    }
    push('personalDetailsList', personalDetails);
    await flush();
    const sampleParticipant = () => FAKE_BASE + Math.floor(rand() * cfg.personalDetails);

    // 3. Policies (workspace chats/rooms/expense reports reference these ids).
    const policyIDs = [];
    for (let p = 0; p < cfg.policies; p++) {
        const policyID = '9' + pad(1000000 + p, 7);
        policyIDs.push(policyID);
        push('policy_' + policyID, {
            id: policyID,
            name: 'Synthetic Workspace ' + (p + 1),
            type: 'team',
            role: 'admin',
            owner: 'fake0@example.com',
            outputCurrency: 'USD',
            isPolicyExpenseChatEnabled: true,
            employeeList: {},
        });
    }
    await flush();

    // 4. Assign a category to every report index up front so links can be resolved in one pass.
    const mix = cfg.mix;
    const categories = new Array(cfg.reports);
    const byCategory = {};
    const assign = (i, cat) => {
        categories[i] = cat;
        (byCategory[cat] = byCategory[cat] || []).push(i);
    };
    assign(0, 'concierge');
    for (let i = 1; i < cfg.reports; i++) {
        const r = rand();
        let acc = 0;
        let cat = 'chat';
        for (const name of ['emptyChat', 'group', 'policyExpenseChat', 'policyRoom', 'expense', 'iou', 'task', 'thread', 'selfDM', 'system']) {
            acc += mix[name];
            if (r < acc) { cat = name; break; }
        }
        assign(i, cat);
    }
    // Money reports need a workspace chat parent; guarantee at least one exists.
    if (!byCategory.policyExpenseChat && (byCategory.expense || []).length) {
        assign(byCategory.expense.pop(), 'policyExpenseChat');
    }
    const reportIDOf = (i) => String(90000000 + i);

    // 5. Plan reportActions: skewed 1/sqrt(rank) budget over the first actionReports eligible reports,
    // plus guaranteed structural actions (thread parents, expense REPORTPREVIEWs, CREATED for the
    // empty-submitted edge case) added when the owning report is generated.
    const actionEligible = [];
    for (let i = 0; i < cfg.reports && actionEligible.length < cfg.actionReports; i++) {
        if (['chat', 'group', 'policyExpenseChat', 'policyRoom', 'concierge'].includes(categories[i])) actionEligible.push(i);
    }
    const weights = actionEligible.map((_, rank) => 1 / Math.sqrt(rank + 1));
    const weightSum = weights.reduce((a, b) => a + b, 0);
    const actionCountByIndex = new Map();
    for (let r = 0; r < actionEligible.length; r++) {
        actionCountByIndex.set(actionEligible[r], Math.max(2, Math.round((cfg.actionsBudget * weights[r]) / weightSum)));
    }
    // Thread parents: chats that will have actions.
    const threadParents = actionEligible.filter((i) => categories[i] === 'chat' || categories[i] === 'group');

    // 6. Plan transactions: distribute the target count over money reports, skewed.
    const moneyIndexes = [...(byCategory.expense || []), ...(byCategory.iou || [])];
    const txnCountByIndex = new Map();
    if (moneyIndexes.length) {
        const txnWeights = moneyIndexes.map((_, rank) => 1 / Math.sqrt(rank + 1));
        const txnWeightSum = txnWeights.reduce((a, b) => a + b, 0);
        for (let r = 0; r < moneyIndexes.length; r++) {
            txnCountByIndex.set(moneyIndexes[r], Math.max(1, Math.round((cfg.transactions * txnWeights[r]) / txnWeightSum)));
        }
    }

    // 6b. Pre-plan REPORTPREVIEW actions: an expense report's parent workspace chat may be generated
    // BEFORE the expense report in the single pass below, so the preview must be known up front.
    // Ids and timestamps are deterministic (no rng) so the linkage is stable across runs.
    const pecIndexes = byCategory.policyExpenseChat || [];
    const previewsByParent = new Map();
    const previewFor = new Map(); // expense index -> {parentIndex, actionID}
    if (pecIndexes.length) {
        for (const e of byCategory.expense || []) {
            const parentIndex = pecIndexes[e % pecIndexes.length];
            const actionID = reportIDOf(parentIndex) + 'preview' + pad(e, 8);
            previewFor.set(e, {parentIndex, actionID});
            const list = previewsByParent.get(parentIndex) || [];
            list.push({actionID, created: toOnyxTs(now - e * 60 * 1000), childReportID: reportIDOf(e)});
            previewsByParent.set(parentIndex, list);
        }
    }

    // 7. Generate everything in one pass.
    let txnSequence = 0;
    let conciergeReportID = null;
    const summaryByCategory = {};
    for (let i = 0; i < cfg.reports; i++) {
        const cat = categories[i];
        summaryByCategory[cat] = (summaryByCategory[cat] || 0) + 1;
        const reportID = reportIDOf(i);
        const other = sampleParticipant();
        const lastTouchedMs = now - ageMinutesFor() * 60 * 1000;
        const isEmpty = cat === 'emptyChat';
        const isHidden = cat === 'chat' && rand() < mix.hidden;
        const isUnread = !isEmpty && rand() < mix.unread;
        const isPinned = !isEmpty && rand() < mix.pinned;
        const isArchived = ['chat', 'group', 'policyRoom'].includes(cat) && rand() < mix.archived;
        const hasDraft = !isEmpty && cat !== 'system' && rand() < mix.draft;
        let isEmptySubmitted = false;

        const report = {
            reportID,
            reportName: 'Chat',
            type: 'chat',
            ownerAccountID: 0,
            managerID: 0,
            stateNum: 0,
            statusNum: 0,
            participants: {
                [selfAccountID]: {notificationPreference: isHidden ? 'hidden' : 'always'},
                [other]: {notificationPreference: 'always'},
            },
            lastReadTime: '',
            isPinned,
            isOwnPolicyExpenseChat: false,
            isWaitingOnBankAccount: false,
            description: '',
            writeCapability: 'all',
            currency: 'USD',
            total: 0,
            nonReimbursableTotal: 0,
            unheldTotal: 0,
            permissions: ['read', 'write'],
            errorFields: {},
        };

        if (cat === 'concierge') {
            conciergeReportID = reportID;
            report.reportName = 'Concierge';
            report.participants = {[selfAccountID]: {notificationPreference: 'always'}, 8: {notificationPreference: 'always'}};
        } else if (cat === 'group') {
            report.chatType = 'group';
            report.reportName = 'Group chat ' + i;
            const groupSize = 3 + Math.floor(rand() * 4);
            for (let g = 0; g < groupSize; g++) report.participants[sampleParticipant()] = {notificationPreference: 'always'};
        } else if (cat === 'policyExpenseChat') {
            const policyID = policyIDs[i % policyIDs.length];
            report.chatType = 'policyExpenseChat';
            report.policyID = policyID;
            report.reportName = 'Synthetic Workspace ' + ((i % policyIDs.length) + 1);
            report.isOwnPolicyExpenseChat = rand() < 0.5;
            report.ownerAccountID = report.isOwnPolicyExpenseChat ? selfAccountID : other;
        } else if (cat === 'policyRoom') {
            const policyID = policyIDs[i % policyIDs.length];
            report.chatType = pick(['policyRoom', 'policyAnnounce', 'policyAdmins']);
            report.policyID = policyID;
            report.reportName = '#room-' + i;
            report.visibility = 'restricted';
        } else if (cat === 'expense' || cat === 'iou') {
            report.type = cat;
            report.reportName = cat === 'expense' ? 'Expense Report #' + i : 'IOU';
            report.ownerAccountID = selfAccountID;
            report.managerID = other;
            isEmptySubmitted = cat === 'expense' && rand() < mix.emptySubmittedExpense;
            if (isEmptySubmitted) {
                report.stateNum = 1;
                report.statusNum = 1;
                report.total = 0;
            } else {
                const submitted = rand() < 0.5;
                report.stateNum = submitted ? 1 : 0;
                report.statusNum = submitted ? 1 : 0;
            }
            const preview = previewFor.get(i);
            if (preview) {
                report.chatReportID = reportIDOf(preview.parentIndex);
                report.parentReportID = reportIDOf(preview.parentIndex);
                report.parentReportActionID = preview.actionID;
                report.policyID = policyIDs[preview.parentIndex % policyIDs.length];
            }
            if (isEmptySubmitted) {
                push('reportActions_' + reportID, {
                    [reportID + 'created0']: {
                        reportActionID: reportID + 'created0',
                        actionName: 'CREATED',
                        actorAccountID: selfAccountID,
                        created: toOnyxTs(lastTouchedMs),
                        message: [{type: 'COMMENT', html: '', text: '', whisperedTo: []}],
                        shouldShow: true,
                    },
                });
            }
        } else if (cat === 'task') {
            report.type = 'task';
            report.reportName = 'Task: follow up #' + i;
            report.ownerAccountID = selfAccountID;
            report.managerID = other;
        } else if (cat === 'thread' && threadParents.length) {
            const parentIndex = pick(threadParents);
            report.parentReportID = reportIDOf(parentIndex);
            report.parentReportActionID = reportIDOf(parentIndex) + pad(0, 8);
            report.reportName = 'Thread on message';
        } else if (cat === 'selfDM') {
            report.chatType = 'selfDM';
            report.reportName = 'Notes to self';
            report.participants = {[selfAccountID]: {notificationPreference: 'always'}};
        } else if (cat === 'system') {
            report.chatType = 'system';
            report.reportName = 'Expensify';
        }

        // Actions for this report (planned budget + guaranteed structural previews).
        const plannedActions = actionCountByIndex.get(i) || 0;
        const previews = previewsByParent.get(i) || [];
        let newestActionTs = null;
        if (plannedActions > 0 || previews.length > 0) {
            const actions = {};
            for (let a = 0; a < plannedActions; a++) {
                const actionID = reportID + pad(a, 8);
                const createdMs = lastTouchedMs - a * (5 + Math.floor(rand() * 240)) * 60 * 1000;
                actions[actionID] = {
                    reportActionID: actionID,
                    actionName: 'ADDCOMMENT',
                    actorAccountID: a % 3 === 0 ? selfAccountID : other,
                    created: toOnyxTs(createdMs),
                    message: [{type: 'COMMENT', html: '<p>Synthetic message ' + a + ' in report ' + i + ' with realistic length of text for sizing.</p>', text: 'Synthetic message ' + a + ' in report ' + i + ' with realistic length of text for sizing.', whisperedTo: []}],
                    person: [{type: 'TEXT', style: 'strong', text: personalDetails[other] ? personalDetails[other].displayName : 'Fake User'}],
                    shouldShow: true,
                };
                if (a === 0) newestActionTs = toOnyxTs(createdMs);
            }
            for (const preview of previews) {
                actions[preview.actionID] = {
                    reportActionID: preview.actionID,
                    actionName: 'REPORTPREVIEW',
                    actorAccountID: selfAccountID,
                    created: preview.created,
                    childReportID: preview.childReportID,
                    message: [{type: 'COMMENT', html: 'Expense report', text: 'Expense report', whisperedTo: []}],
                    shouldShow: true,
                };
                if (!newestActionTs || preview.created > newestActionTs) newestActionTs = preview.created;
            }
            push('reportActions_' + reportID, actions);
        }

        // Consistency: lastVisibleActionCreated matches the newest action when the report has any.
        if (!isEmpty) {
            const lastVisible = newestActionTs || toOnyxTs(lastTouchedMs);
            report.lastVisibleActionCreated = lastVisible;
            report.lastMessageText = 'Synthetic message in report ' + i;
            report.lastActorAccountID = other;
            report.lastReadTime = isUnread ? toOnyxTs(lastTouchedMs - 60 * 60 * 1000) : lastVisible;
        }

        // Transactions for money reports: written here, summed into the report total.
        // The empty-submitted edge case must stay genuinely empty — no transactions, total 0.
        const txnCount = isEmptySubmitted ? 0 : txnCountByIndex.get(i) || 0;
        let total = 0;
        for (let t = 0; t < txnCount; t++) {
            const transactionID = String(91000000 + txnSequence++);
            const amount = (100 + Math.floor(rand() * 25000));
            total += amount;
            push('transactions_' + transactionID, {
                transactionID,
                reportID,
                amount,
                currency: 'USD',
                merchant: pick(['Uber', 'Starbucks', 'AWS', 'Delta', 'Żabka', 'WeWork', 'Apple', 'Localhost Cafe']) + ' ' + (t % 7),
                created: toOnyxTs(lastTouchedMs - t * 86400000).slice(0, 10),
                comment: {comment: t % 4 === 0 ? 'Team offsite' : ''},
                category: pick(['Meals', 'Travel', 'Software', 'Office']),
                tag: '',
                billable: false,
                reimbursable: true,
            });
        }
        if (txnCount > 0) report.total = total;

        push('report_' + reportID, report);
        if (hasDraft) push('reportDraftComment_' + reportID, 'Draft reply in report ' + i + ' — not sent yet');
        if (isArchived) push('reportNameValuePairs_' + reportID, {private_isArchived: toOnyxTs(lastTouchedMs)});

        if (pairs.length >= 400) await flush();
    }
    await flush();

    return {
        written,
        approxMB: Math.round((bytes / 1048576) * 10) / 10,
        conciergeReportID,
        selfAccountID,
        byCategory: summaryByCategory,
        counts: {reports: cfg.reports, transactions: txnSequence, personalDetails: cfg.personalDetails, policies: cfg.policies},
    };
}`;

export {SEED_REALISTIC_FN, resolveCounts, DEFAULT_MIX, COMPANION_ANCHORS};
