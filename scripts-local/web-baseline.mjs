#!/usr/bin/env node
/**
 * Web cold-start baseline harness for the SQLite-buffer project (2026-09-07).
 *
 * Measures, per synthetic account size, what the current Onyx architecture pays on startup:
 *   - LCP / FCP / long tasks (page-context PerformanceObserver probe)
 *   - IndexedDB read time per Onyx collection prefix (patched IDBKeyValProvider → __onyxIDBStats)
 *   - LHN compute cost (patched SidebarUtils → performance.measure 'LHN:*')
 *   - JS heap after settle (CDP Performance.getMetrics)
 *
 * Prereqs: `npm run build` done (dist/), servers running:
 *   bun web/proxy.ts                                   (port 9000)
 *   node_modules/.bin/http-server ./dist --cors -p 8080 -P http://localhost:9000
 *
 * Usage:
 *   node scripts-local/web-baseline.mjs login [--email user+x@gmail.com]
 *   node scripts-local/web-baseline.mjs seed --size 1000        (size 0 wipes synthetic data)
 *   node scripts-local/web-baseline.mjs seed-real --size 10000  (realistic mix/ratios; see seed-realistic.mjs)
 *   node scripts-local/web-baseline.mjs measure --label size1000 --runs 5 [--throttle 4]
 *   node scripts-local/web-baseline.mjs report
 */
import fs from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {DEFAULT_MIX, resolveCounts, SEED_REALISTIC_FN} from './seed-realistic.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(__dirname, 'harness', 'package.json'));
const {chromium} = require('playwright-core');

// Target app origin. Default is the prod static build (localhost:8080) used for perf measurement.
// Point at the dev server for convenient login (`--url https://dev.new.expensify.com:8082`, magic code
// 000000) when doing functional testing rather than measuring. Env HARNESS_APP_URL also works.
const appUrlArgIndex = process.argv.indexOf('--url');
const APP_URL = appUrlArgIndex !== -1 ? process.argv[appUrlArgIndex + 1] : process.env.HARNESS_APP_URL || 'http://localhost:8080';
const IS_HTTPS_TARGET = APP_URL.startsWith('https:');
// A dedicated Chrome profile per target account keeps each account's session and (local-only)
// synthetic data isolated — seed a different account with `--profile <name>` without touching
// the account you're logged into elsewhere.
const profileArgIndex = process.argv.indexOf('--profile');
const PROFILE_NAME = profileArgIndex !== -1 ? process.argv[profileArgIndex + 1] : process.argv.includes('--real') ? '.pw-profile-real' : '.pw-profile';
const PROFILE_DIR = path.isAbsolute(PROFILE_NAME) ? PROFILE_NAME : path.join(__dirname, PROFILE_NAME);
const RESULTS_DIR = path.join(__dirname, 'baseline-results');
const SHOTS_DIR = path.join(__dirname, 'baseline-shots');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BLOCKED_HOSTS = ['ingest.us.sentry.io', 'googletagmanager.com', 'fullstory.com', 'ketchcdn.com', 'convertexperiments.com', 'launchdarkly.com'];

fs.mkdirSync(RESULTS_DIR, {recursive: true});
fs.mkdirSync(SHOTS_DIR, {recursive: true});

function arg(name, fallback) {
    const index = process.argv.indexOf(`--${name}`);
    return index === -1 ? fallback : process.argv[index + 1];
}

async function launch({headless = false} = {}) {
    const context = await chromium.launchPersistentContext(PROFILE_DIR, {
        executablePath: CHROME,
        headless,
        viewport: process.argv.includes('--narrow') ? {width: 700, height: 900} : {width: 1440, height: 900},
        // The dev server serves over HTTPS with a self-signed cert.
        ignoreHTTPSErrors: IS_HTTPS_TARGET,
        args: ['--disable-extensions', '--no-first-run', '--no-default-browser-check'],
        // The Workbox service worker precaches a previous build and silently serves stale JS on the
        // first load after a rebuild — block it so every run executes the current dist.
        serviceWorkers: 'block',
    });
    await context.route('**/*', (route) => {
        const url = route.request().url();
        if (BLOCKED_HOSTS.some((host) => url.includes(host))) {
            return route.abort();
        }
        return route.continue();
    });
    return context;
}

const PROBE = `
(() => {
    const probe = (window.__probe = {lcp: 0, fcp: 0, longTasks: [], navStart: performance.timeOrigin});
    try {
        new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) probe.lcp = Math.max(probe.lcp, entry.startTime);
        }).observe({type: 'largest-contentful-paint', buffered: true});
        new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) if (entry.name === 'first-contentful-paint') probe.fcp = entry.startTime;
        }).observe({type: 'paint', buffered: true});
        new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) probe.longTasks.push({start: entry.startTime, duration: entry.duration});
        }).observe({type: 'longtask', buffered: true});
    } catch (e) {}
})();
`;

async function collectMetrics(page, cdp) {
    const inPage = await page.evaluate(() => {
        const probe = window.__probe ?? {};
        const measures = {};
        for (const entry of performance.getEntriesByType('measure')) {
            if (!entry.name.startsWith('LHN:') && !entry.name.startsWith('onyx:') && !entry.name.startsWith('sqliteBuffer:')) continue;
            const bucket = (measures[entry.name] = measures[entry.name] ?? {count: 0, totalMs: 0, maxMs: 0, firstStart: entry.startTime});
            bucket.count += 1;
            bucket.totalMs += entry.duration;
            bucket.maxMs = Math.max(bucket.maxMs, entry.duration);
        }
        const longTasks = probe.longTasks ?? [];
        return {
            lcp: probe.lcp ?? 0,
            fcp: probe.fcp ?? 0,
            longTaskCount: longTasks.length,
            longTaskTotalMs: longTasks.reduce((sum, task) => sum + task.duration, 0),
            longTaskMaxMs: longTasks.reduce((max, task) => Math.max(max, task.duration), 0),
            measures,
            onyxIDB: window.__onyxIDBStats ?? null,
            usedJSHeapMB: performance.memory ? performance.memory.usedJSHeapSize / 1048576 : null,
        };
    });
    const {metrics} = await cdp.send('Performance.getMetrics');
    const metric = (name) => metrics.find((m) => m.name === name)?.value ?? null;
    return {
        ...inPage,
        cdpJSHeapUsedMB: metric('JSHeapUsedSize') / 1048576,
        cdpScriptDurationS: metric('ScriptDuration'),
        cdpLayoutDurationS: metric('LayoutDuration'),
        cdpNodes: metric('Nodes'),
    };
}

// Waits until the app is genuinely settled: LCP seen, LHN computed at least once, and no long task in the last `quietMs`.
async function waitForSettle(page, {quietMs = 5000, timeoutMs = 180000} = {}) {
    const start = Date.now();
    for (;;) {
        // The app can navigate mid-wait (fresh-login transitions) — treat a destroyed context as "not settled yet".
        const state = await page
            .evaluate(() => {
                const probe = window.__probe ?? {lcp: 0, longTasks: []};
                const lastTask = probe.longTasks.length ? probe.longTasks[probe.longTasks.length - 1] : null;
                return {
                    lcp: probe.lcp,
                    lhnComputed: performance.getEntriesByName('LHN:getReportsToDisplay', 'measure').length > 0 || performance.getEntriesByName('sqliteBuffer:lhnData', 'measure').length > 0,
                    lastTaskEnd: lastTask ? lastTask.start + lastTask.duration : 0,
                    now: performance.now(),
                };
            })
            .catch(() => null);
        if (!state) {
            await page.waitForTimeout(1000);
            if (Date.now() - start > timeoutMs) return false;
            continue;
        }
        const quietFor = state.now - state.lastTaskEnd;
        if (state.lcp > 0 && state.lhnComputed && quietFor > quietMs) return true;
        if (Date.now() - start > timeoutMs) return false;
        await page.waitForTimeout(1000);
    }
}

async function commandLogin() {
    const email = arg('email', `user+perfbase${Date.now().toString().slice(-6)}@gmail.com`);
    console.log(`Logging in as ${email}`);
    const context = await launch();
    const page = context.pages()[0] ?? (await context.newPage());
    const shot = async (name) => {
        await page.screenshot({path: path.join(SHOTS_DIR, `${name}.png`)}).catch(() => {});
        console.log(`  [shot] ${name}`);
    };
    await page.goto(APP_URL, {waitUntil: 'domcontentloaded'});
    await page.waitForTimeout(6000);
    await shot('01-initial');

    const emailInput = page.locator('input#username, input[name="username"], input[type="email"], input[aria-label*="email" i], input[aria-label*="Phone" i]').first();
    if (await emailInput.isVisible().catch(() => false)) {
        await emailInput.fill(email);
        await emailInput.press('Enter');
        await page.waitForTimeout(6000);
        await shot('02-after-email');

        const joinButton = page.locator('button:has-text("Join"), div[role="button"]:has-text("Join")').first();
        if (await joinButton.isVisible().catch(() => false)) {
            await joinButton.click();
            await page.waitForTimeout(8000);
            await shot('03-after-join');
        } else {
            const codeInput = page.locator('input[autocomplete="one-time-code"], input[name="validateCode"]').first();
            if (await codeInput.isVisible().catch(() => false)) {
                await codeInput.fill('000000');
                await page.waitForTimeout(8000);
                await shot('03-after-code');
            }
        }
    } else {
        console.log('  no email input found — maybe already logged in');
    }

    // Best-effort onboarding walk: keep clicking the most plausible primary action until LHN computes.
    for (let step = 0; step < 15; step++) {
        const done = await page.evaluate(() => performance.getEntriesByName('LHN:getReportsToDisplay', 'measure').length > 0);
        if (done) break;
        const candidates = [
            'div[role="button"]:has-text("Something else")',
            'div[role="button"]:has-text("Chat and split expenses")',
            'button:has-text("Continue")',
            'div[role="button"]:has-text("Continue")',
            'button:has-text("Get started")',
            'div[role="button"]:has-text("Get started")',
        ];
        let clicked = false;
        for (const selector of candidates) {
            const element = page.locator(selector).first();
            if (await element.isVisible().catch(() => false)) {
                // Onboarding may require the name form before Continue works — fill any empty text inputs first.
                const inputs = page.locator('input[type="text"]:visible');
                const inputCount = await inputs.count().catch(() => 0);
                for (let i = 0; i < inputCount; i++) {
                    const input = inputs.nth(i);
                    if ((await input.inputValue().catch(() => 'x')) === '') {
                        await input.fill(i === 0 ? 'Perf' : 'Baseline').catch(() => {});
                    }
                }
                await element.click().catch(() => {});
                clicked = true;
                break;
            }
        }
        await page.waitForTimeout(4000);
        await shot(`onboarding-${String(step).padStart(2, '0')}${clicked ? '' : '-idle'}`);
    }

    const settled = await waitForSettle(page, {quietMs: 4000, timeoutMs: 60000});
    await shot('99-final');
    console.log(settled ? `Login OK: ${email} (profile persisted)` : 'Login did NOT settle — check baseline-shots/');
    fs.writeFileSync(path.join(RESULTS_DIR, 'account.json'), JSON.stringify({email, createdAt: new Date().toISOString()}, null, 2));
    await context.close();
}

// Runs inside the page. Wipes previous synthetic keys, then writes `size` reports (+actions/transactions/personal details).
const SEED_FN = `async ({size, actionsPerReport, actionReportLimit}) => {
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

    // 1. Wipe previous synthetic data (all synthetic ids live in the 9xxxxxxx range).
    await wipeRange('reportActions_90000000', 'reportActions_99999999~');
    await wipeRange('report_90000000', 'report_99999999~');
    await wipeRange('transactions_90000000', 'transactions_99999999~');
    if (size === 0) return {written: 0};

    const session = await get('session');
    const selfAccountID = session?.accountID ?? 1;

    const FAKE_BASE = 80000000;
    const FAKE_COUNT = 60;
    const pad = (n, width) => String(n).padStart(width, '0');
    const timestampFor = (i) => {
        const date = new Date(Date.now() - i * 47 * 60 * 1000); // spread over ~11 months for 10k
        return date.toISOString().slice(0, 19).replace('T', ' ') + '.' + pad(date.getMilliseconds(), 3);
    };
    const LOREM = 'This report was synthesized for the local cold-start baseline. It exists to make the record realistically sized, the way a normal chat report carries a description, settings and metadata. ';

    let bytes = 0;
    let pairs = [];
    let flushed = 0;
    const flush = async () => {
        if (!pairs.length) return;
        await putBatch(pairs);
        flushed += pairs.length;
        pairs = [];
    };

    for (let i = 0; i < size; i++) {
        const reportID = String(90000000 + i);
        const otherAccountID = FAKE_BASE + (i % FAKE_COUNT) + 1;
        const created = timestampFor(i);
        const unread = i % 10 === 0;
        const report = {
            reportID,
            reportName: 'Chat',
            type: 'chat',
            ownerAccountID: 0,
            managerID: 0,
            policyID: undefined,
            stateNum: 0,
            statusNum: 0,
            participants: {
                [selfAccountID]: {notificationPreference: 'always'},
                [otherAccountID]: {notificationPreference: 'always'},
            },
            lastMessageText: 'Synthetic message #' + i + ' — the quick brown fox jumps over the lazy dog.',
            lastMessageHtml: '<p>Synthetic message #' + i + '</p>',
            lastVisibleActionCreated: created,
            lastActionType: 'ADDCOMMENT',
            lastActorAccountID: otherAccountID,
            lastReadTime: unread ? timestampFor(i + 5000) : created,
            isPinned: i % 50 === 0,
            isOwnPolicyExpenseChat: false,
            isWaitingOnBankAccount: false,
            description: (LOREM + LOREM).slice(0, 380),
            welcomeMessage: '',
            writeCapability: 'all',
            visibility: undefined,
            currency: 'USD',
            total: 0,
            nonReimbursableTotal: 0,
            unheldTotal: 0,
            permissions: ['read', 'write'],
            lastMentionedTime: '',
            managerEmail: '',
            errorFields: {},
        };
        pairs.push(['report_' + reportID, report]);
        bytes += JSON.stringify(report).length;

        if (i < actionReportLimit) {
            const actions = {};
            for (let a = 0; a < actionsPerReport; a++) {
                const actionID = reportID + pad(a, 8);
                actions[actionID] = {
                    reportActionID: actionID,
                    actionName: 'ADDCOMMENT',
                    actorAccountID: a % 2 === 0 ? otherAccountID : selfAccountID,
                    created: timestampFor(i + a),
                    message: [{type: 'COMMENT', html: '<p>Baseline filler comment number ' + a + ' with a plausible amount of text in it for realism.</p>', text: 'Baseline filler comment number ' + a + ' with a plausible amount of text in it for realism.', whisperedTo: []}],
                    person: [{type: 'TEXT', style: 'strong', text: 'Fake User ' + (i % FAKE_COUNT)}],
                    shouldShow: true,
                    isFirstItem: a === actionsPerReport - 1,
                };
            }
            pairs.push(['reportActions_' + reportID, actions]);
            bytes += JSON.stringify(actions).length;
        }

        if (i % 3 === 0) {
            const transactionID = String(90000000 + i);
            const transaction = {
                transactionID,
                reportID,
                amount: (i % 200) * 100,
                currency: 'USD',
                merchant: 'Synthetic Merchant ' + (i % 40),
                created: created.slice(0, 10),
                comment: {comment: ''},
                category: 'Meals',
                tag: '',
                billable: false,
                reimbursable: true,
            };
            pairs.push(['transactions_' + transactionID, transaction]);
            bytes += JSON.stringify(transaction).length;
        }

        if (pairs.length >= 500) await flush();
    }
    await flush();

    // Personal details for the fake participants (merge into the existing object).
    const personalDetails = (await get('personalDetailsList')) ?? {};
    for (let f = 1; f <= FAKE_COUNT; f++) {
        const accountID = FAKE_BASE + f;
        personalDetails[accountID] = {
            accountID,
            login: 'fake' + f + '@example.com',
            displayName: 'Fake User ' + f,
            firstName: 'Fake',
            lastName: 'User ' + f,
            avatar: '',
            pronouns: '',
            timezone: {automatic: true, selected: 'UTC'},
        };
    }
    await putBatch([['personalDetailsList', personalDetails]]);
    return {written: flushed, approxMB: Math.round(bytes / 1048576 * 10) / 10};
}`;

async function commandSeed() {
    const size = Number(arg('size', '100'));
    const actionsPerReport = Number(arg('actions', '20'));
    const actionReportLimit = Math.min(size, Number(arg('action-reports', '300')));
    console.log(`Seeding ${size} reports (${actionsPerReport} actions × first ${actionReportLimit})`);
    const context = await launch();
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(APP_URL, {waitUntil: 'domcontentloaded'});
    // Let the app boot and finish its own writes before we bulk-write.
    await page.waitForTimeout(15000);
    const result = await page.evaluate(`(${SEED_FN})(${JSON.stringify({size, actionsPerReport, actionReportLimit})})`);
    console.log('Seed result:', JSON.stringify(result));
    // Give IDB a moment, then close WITHOUT letting the app reconcile anything else.
    await page.waitForTimeout(2000);
    await context.close();
}

// Realistic seed (v1 scale ratios from Sentry raw attributes + v2 category mix); see seed-realistic.mjs.
async function commandSeedRealistic() {
    const reports = Number(arg('size', '10000'));
    const rngSeed = Number(arg('rng-seed', '1'));
    const counts = resolveCounts(reports);
    const actionReports = Math.min(reports, Number(arg('action-reports', '500')));
    const actionsBudget = Number(arg('actions-budget', String(Math.min(reports * 6, 60000))));
    const cfg = {...counts, actionReports, actionsBudget, rngSeed, mix: DEFAULT_MIX};
    console.log(`Realistic seed: reports=${reports} transactions=${counts.transactions} personalDetails=${counts.personalDetails} policies=${counts.policies}`);
    console.log(`  actions: budget=${actionsBudget} over first ${actionReports} eligible reports; rngSeed=${rngSeed}`);
    const context = await launch();
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(APP_URL, {waitUntil: 'domcontentloaded'});
    // Let the app boot and finish its own writes before we bulk-write.
    await page.waitForTimeout(15000);
    const result = await page.evaluate(`(${SEED_REALISTIC_FN})(${JSON.stringify(cfg)})`);
    console.log('Seed result:', JSON.stringify(result, null, 2));
    await page.waitForTimeout(2000);
    await context.close();
}

async function commandMeasure() {
    const label = arg('label', 'unlabeled');
    const runs = Number(arg('runs', '5'));
    const throttle = Number(arg('throttle', '1'));
    const offset = Number(arg('offset', '0'));
    console.log(`Measuring: label=${label} runs=${runs} offset=${offset} cpuThrottle=${throttle}x`);

    const bufferEnabled = process.argv.includes('--buffer');
    const flipEnabled = process.argv.includes('--flip');

    for (let run = offset + 1; run <= offset + runs; run++) {
        const context = await launch();
        const page = context.pages()[0] ?? (await context.newPage());
        await page.addInitScript(PROBE);
        await page.addInitScript(
            `try { localStorage.setItem('sqliteBufferEnabled', '${bufferEnabled || flipEnabled}'); localStorage.setItem('sqliteBufferFlip', '${flipEnabled}'); } catch (e) {}`,
        );
        const cdp = await context.newCDPSession(page);
        await cdp.send('Performance.enable');
        await cdp.send('Network.enable');
        await cdp.send('Network.setCacheDisabled', {cacheDisabled: true});
        if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', {rate: throttle});

        const t0 = Date.now();
        await page.goto(`${APP_URL}/inbox`, {waitUntil: 'domcontentloaded'});
        const settled = await waitForSettle(page);
        const metrics = await collectMetrics(page, cdp);
        metrics.settled = settled;
        metrics.wallClockMs = Date.now() - t0;
        metrics.label = label;
        metrics.run = run;
        metrics.throttle = throttle;
        metrics.timestamp = new Date().toISOString();

        const file = path.join(RESULTS_DIR, `${label}-x${throttle}-run${run}.json`);
        fs.writeFileSync(file, JSON.stringify(metrics, null, 2));
        const reportPrefix = metrics.onyxIDB?.byPrefix?.report_ ?? {keys: 0, ms: 0};
        console.log(
            `  run${run}: lcp=${metrics.lcp.toFixed(0)}ms lt=${metrics.longTaskTotalMs.toFixed(0)}ms/${metrics.longTaskCount} ` +
                `ltMax=${metrics.longTaskMaxMs.toFixed(0)} heap=${metrics.cdpJSHeapUsedMB.toFixed(0)}MB ` +
                `idb[report_]=${reportPrefix.keys}keys/${reportPrefix.ms.toFixed(0)}ms ` +
                `lhn=${(metrics.measures['LHN:getReportsToDisplay']?.totalMs ?? 0).toFixed(0)}ms settled=${settled}`,
        );
        await context.close();
    }
}

function median(values) {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
}

async function commandReport() {
    const files = fs.readdirSync(RESULTS_DIR).filter((file) => file.endsWith('.json') && file.includes('-run'));
    const groups = {};
    for (const file of files) {
        const data = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, file), 'utf8'));
        const key = `${data.label}-x${data.throttle}`;
        (groups[key] = groups[key] ?? []).push(data);
    }
    const rows = [];
    for (const [key, group] of Object.entries(groups).sort()) {
        const pick = (fn) => median(group.map(fn));
        rows.push({
            config: key,
            n: group.length,
            lcp: Math.round(pick((r) => r.lcp)),
            ltTotal: Math.round(pick((r) => r.longTaskTotalMs)),
            ltMax: Math.round(pick((r) => r.longTaskMaxMs)),
            heapMB: Math.round(pick((r) => r.cdpJSHeapUsedMB)),
            idbReportMs: Math.round(pick((r) => r.onyxIDB?.byPrefix?.report_?.ms ?? 0)),
            idbReportKeys: Math.round(pick((r) => r.onyxIDB?.byPrefix?.report_?.keys ?? 0)),
            idbTotalMs: Math.round(pick((r) => r.onyxIDB?.totalMs ?? 0)),
            lhnComputeMs: Math.round(pick((r) => (r.measures?.['LHN:getReportsToDisplay']?.totalMs ?? 0) + (r.measures?.['LHN:updateReportsToDisplay']?.totalMs ?? 0))),
            lhnSortMs: Math.round(pick((r) => r.measures?.['LHN:sort']?.totalMs ?? 0)),
            scriptS: Number(pick((r) => r.cdpScriptDurationS ?? 0).toFixed(1)),
        });
    }
    console.table(rows);
    fs.writeFileSync(path.join(RESULTS_DIR, 'summary.json'), JSON.stringify(rows, null, 2));
}

// Enables the buffer flag, lets the app settle, then verifies the SQLite buffer against IndexedDB:
// row counts per entity plus deep-equality on a random sample of full values.
async function commandBufferCheck() {
    const sample = Number(arg('sample', '50'));
    const context = await launch();
    const page = context.pages()[0] ?? (await context.newPage());
    await page.addInitScript(PROBE);
    await page.addInitScript(`try { localStorage.setItem('sqliteBufferEnabled', 'true'); localStorage.setItem('sqliteBufferFlip', 'false'); } catch (e) {}`);
    const cacheCdp = await context.newCDPSession(page);
    await cacheCdp.send('Network.enable');
    await cacheCdp.send('Network.setCacheDisabled', {cacheDisabled: true});
    await page.goto(`${APP_URL}/inbox`, {waitUntil: 'domcontentloaded'});
    const settled = await waitForSettle(page);
    // Give the mirror a moment to flush the last batches after settle.
    await page.waitForTimeout(3000);

    const result = await page.evaluate(async (sampleSize) => {
        const buffer = window.__sqliteBuffer;
        if (!buffer) {
            return {error: 'window.__sqliteBuffer missing — flag not picked up or init failed'};
        }
        const stats = await buffer.stats();

        const DB = await new Promise((resolve, reject) => {
            const req = indexedDB.open('OnyxDB');
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        const idbKeysInRange = (lo, hi) =>
            new Promise((resolve, reject) => {
                const req = DB.transaction('keyvaluepairs').objectStore('keyvaluepairs').getAllKeys(IDBKeyRange.bound(lo, hi));
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        const idbGet = (key) =>
            new Promise((resolve, reject) => {
                const req = DB.transaction('keyvaluepairs').objectStore('keyvaluepairs').get(key);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });

        const deepEqual = (a, b) => {
            if (a === b) {
                return true;
            }
            if (typeof a !== typeof b || a === null || b === null) {
                return false;
            }
            if (typeof a !== 'object') {
                return false;
            }
            const aKeys = Object.keys(a).filter((k) => a[k] !== undefined);
            const bKeys = Object.keys(b).filter((k) => b[k] !== undefined);
            if (aKeys.length !== bKeys.length) {
                return false;
            }
            return aKeys.every((k) => deepEqual(a[k], b[k]));
        };

        const check = async (entity, prefix) => {
            const keys = await idbKeysInRange(prefix, `${prefix}￿`);
            const ids = keys.map((k) => k.slice(prefix.length));
            const sampled = [];
            for (let i = 0; i < Math.min(sampleSize, ids.length); i++) {
                sampled.push(ids[Math.floor((i / Math.min(sampleSize, ids.length)) * ids.length)]);
            }
            const bufferRows = await buffer.compare(entity, sampled);
            const mismatches = [];
            for (const id of sampled) {
                const idbValue = await idbGet(prefix + id);
                const bufferValue = bufferRows[id] === null || bufferRows[id] === undefined ? null : JSON.parse(bufferRows[id]);
                if (!deepEqual(idbValue ?? null, bufferValue)) {
                    mismatches.push(id);
                }
            }
            return {idbCount: ids.length, sampled: sampled.length, mismatches};
        };

        return {
            stats,
            report: await check('report', 'report_'),
            reportActions: await check('reportActions', 'reportActions_'),
            transaction: await check('transaction', 'transactions_'),
        };
    }, sample);

    result.settled = settled;
    fs.writeFileSync(path.join(RESULTS_DIR, 'buffer-check.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
    await context.close();
}

// LHN parity: compares the worker's SQL/JS-port ordering against the captured JS ground truth (__lhnJS).
async function commandLhnCheck() {
    const context = await launch();
    const page = context.pages()[0] ?? (await context.newPage());
    await page.addInitScript(PROBE);
    await page.addInitScript(`try { localStorage.setItem('sqliteBufferEnabled', 'true'); localStorage.setItem('sqliteBufferFlip', 'false'); } catch (e) {}`);
    const cacheCdp = await context.newCDPSession(page);
    await cacheCdp.send('Network.enable');
    await cacheCdp.send('Network.setCacheDisabled', {cacheDisabled: true});
    await page.goto(`${APP_URL}/inbox`, {waitUntil: 'domcontentloaded'});
    const settled = await waitForSettle(page);
    await page.waitForTimeout(3000);

    const result = await page.evaluate(async () => {
        const js = window.__lhnJS;
        const buffer = window.__sqliteBuffer;
        if (!js) {
            return {error: '__lhnJS missing — JS LHN never ran'};
        }
        if (!buffer) {
            return {error: '__sqliteBuffer missing'};
        }
        const focusMode = js.priorityMode === 'gsd';
        const t0 = performance.now();
        const worker = await buffer.lhn(js.displayIds, focusMode);
        const roundTripMs = performance.now() - t0;

        const jsIds = js.orderedIds;
        const workerIds = worker.orderedIds;
        const divergences = [];
        const maxLen = Math.max(jsIds.length, workerIds.length);
        for (let i = 0; i < maxLen && divergences.length < 10; i++) {
            if (jsIds[i] !== workerIds[i]) {
                divergences.push({index: i, js: jsIds[i] ?? null, worker: workerIds[i] ?? null, jsFlags: js.displayFlags[jsIds[i]] ?? null});
            }
        }
        let matching = 0;
        for (let i = 0; i < maxLen; i++) {
            if (jsIds[i] === workerIds[i]) {
                matching++;
            }
        }
        // Full pipeline: worker computes membership itself and orders it — the stage-3 target path.
        let full = null;
        if (window.__lhnParams) {
            const t1 = performance.now();
            const workerFull = await buffer.lhnFull(window.__lhnParams);
            const fullRoundTripMs = performance.now() - t1;
            const jsSet = new Set(jsIds);
            const workerSet = new Set(workerFull.orderedIds);
            const missingInWorker = jsIds.filter((id) => !workerSet.has(id));
            const extraInWorker = workerFull.orderedIds.filter((id) => !jsSet.has(id));
            let fullMatching = 0;
            const fullMax = Math.max(jsIds.length, workerFull.orderedIds.length);
            for (let i = 0; i < fullMax; i++) {
                if (jsIds[i] === workerFull.orderedIds[i]) {
                    fullMatching++;
                }
            }
            full = {
                workerCount: workerFull.orderedIds.length,
                membership: {
                    missingInWorker: missingInWorker.length,
                    extraInWorker: extraInWorker.length,
                    missingSample: missingInWorker.slice(0, 8),
                    extraSample: extraInWorker.slice(0, 8),
                },
                positionalMatch: `${fullMatching}/${fullMax} (${((fullMatching / Math.max(fullMax, 1)) * 100).toFixed(2)}%)`,
                workerComputeMs: Math.round(workerFull.tookMs),
                roundTripMs: Math.round(fullRoundTripMs),
                error: workerFull.error ?? null,
            };
        }

        const lhnMeasures = performance.getEntriesByName('LHN:getReportsToDisplay', 'measure').concat(performance.getEntriesByName('LHN:sort', 'measure'));
        return {
            full,
            jsCount: jsIds.length,
            workerCount: workerIds.length,
            missingInBuffer: worker.missingIds.length,
            positionalMatch: `${matching}/${maxLen} (${((matching / Math.max(maxLen, 1)) * 100).toFixed(2)}%)`,
            firstDivergences: divergences,
            workerError: worker.error ?? null,
            timing: {workerComputeMs: Math.round(worker.tookMs), roundTripMs: Math.round(roundTripMs), jsLHNTotalMs: Math.round(lhnMeasures.reduce((s, m) => s + m.duration, 0))},
            focusMode,
        };
    });

    result.settled = settled;
    fs.writeFileSync(path.join(RESULTS_DIR, 'lhn-check.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
    await context.close();
}

// Local FTS search vs server keyword search, end-to-end on the same page.
async function commandSearchCheck() {
    const query = arg('query', 'realism');
    const context = await launch();
    const page = context.pages()[0] ?? (await context.newPage());
    await page.addInitScript(PROBE);
    await page.addInitScript(`try { localStorage.setItem('sqliteBufferEnabled', 'true'); localStorage.setItem('sqliteBufferFlip', 'false'); } catch (e) {}`);
    const cacheCdp = await context.newCDPSession(page);
    await cacheCdp.send('Network.enable');
    await cacheCdp.send('Network.setCacheDisabled', {cacheDisabled: true});
    await page.goto(`${APP_URL}/inbox`, {waitUntil: 'domcontentloaded'});
    await waitForSettle(page);

    // Local FTS: 6 runs (first is cold), medians on the rest.
    const local = await page.evaluate(async (q) => {
        const runs = [];
        let sample = null;
        for (let i = 0; i < 6; i++) {
            const t0 = performance.now();
            const res = await window.__sqliteBuffer.search(q, 50);
            runs.push({roundTripMs: Math.round((performance.now() - t0) * 10) / 10, workerMs: Math.round(res.tookMs * 10) / 10, results: res.results.length, error: res.error ?? null});
            if (!sample) sample = res.results.slice(0, 3);
        }
        const stats = await window.__sqliteBuffer.stats();
        return {runs, sample, ftsRows: stats.worker.rows.fts, backfill: {indexed: stats.worker.ftsBackfillIndexed, ms: stats.worker.ftsBackfillMs}};
    }, query);

    // Server keyword search: navigate to the Search page and time until result rows (or empty state) render.
    const serverT0 = Date.now();
    await page.goto(`${APP_URL}/search?q=${encodeURIComponent(`type:chat keyword:"${query}"`)}`, {waitUntil: 'domcontentloaded'});
    let serverMs = null;
    let serverOutcome = 'timeout';
    for (let i = 0; i < 120; i++) {
        const state = await page.evaluate(() => {
            const text = document.body.innerText;
            const rows = document.querySelectorAll('[data-testid="selection-list"] [role="button"], [aria-label="search-results"] [role="button"]').length;
            return {rows, hasEmpty: /nothing to show|no results|didn.t find/i.test(text), stillLoading: /skeleton/i.test(document.body.innerHTML)};
        });
        if (state.rows > 0 || state.hasEmpty) {
            serverMs = Date.now() - serverT0;
            serverOutcome = state.rows > 0 ? `${state.rows} rows` : 'empty state';
            break;
        }
        await page.waitForTimeout(250);
    }
    await page.screenshot({path: path.join(SHOTS_DIR, 'search-server.png')}).catch(() => {});

    const result = {query, local, server: {endToEndMs: serverMs, outcome: serverOutcome, note: 'full page navigation + Search API + snapshot render; measured on /search route'}};
    fs.writeFileSync(path.join(RESULTS_DIR, 'search-check.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
    await context.close();
}

// Post-LCP main-thread responsiveness: event-loop lag sampling + first-interaction latency.
// Fair off-vs-flip comparison: both render the same /inbox LHN; the difference is what the main
// thread is chewing on after first paint (hydration aftermath, GC, derived recomputes).
async function commandInteractCheck() {
    const label = arg('label', 'interact');
    const throttle = Number(arg('throttle', '1'));
    const runs = Number(arg('runs', '3'));
    const flipEnabled = process.argv.includes('--flip');

    for (let run = 1; run <= runs; run++) {
        const context = await launch();
        const page = context.pages()[0] ?? (await context.newPage());
        await page.addInitScript(PROBE);
        await page.addInitScript(`try { localStorage.setItem('sqliteBufferEnabled', '${flipEnabled}'); localStorage.setItem('sqliteBufferFlip', '${flipEnabled}'); } catch (e) {}`);
        const cdp = await context.newCDPSession(page);
        await cdp.send('Performance.enable');
        await cdp.send('Network.enable');
        await cdp.send('Network.setCacheDisabled', {cacheDisabled: true});
        if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', {rate: throttle});

        await page.goto(`${APP_URL}/inbox`, {waitUntil: 'domcontentloaded'});

        // Wait only for LCP — the interesting window is the busy tail right after first paint.
        for (let i = 0; i < 120; i++) {
            const lcp = await page.evaluate(() => window.__probe?.lcp ?? 0);
            if (lcp > 0) break;
            await page.waitForTimeout(250);
        }

        // 12s of event-loop lag sampling: schedule a 50ms timer, measure overshoot.
        const sampling = await page.evaluate(
            () =>
                new Promise((resolve) => {
                    const lags = [];
                    const windowStart = performance.now();
                    const tick = () => {
                        const scheduled = performance.now();
                        setTimeout(() => {
                            lags.push(performance.now() - scheduled - 50);
                            if (performance.now() - windowStart < 12000) {
                                tick();
                            } else {
                                lags.sort((a, b) => a - b);
                                const at = (q) => Math.round(lags[Math.min(lags.length - 1, Math.floor(q * lags.length))] * 10) / 10;
                                const tasks = (window.__probe?.longTasks ?? []).filter((t) => t.start >= windowStart);
                                resolve({
                                    samples: lags.length,
                                    lagP50: at(0.5),
                                    lagP95: at(0.95),
                                    lagMax: Math.round(lags[lags.length - 1]),
                                    longTasksInWindow: tasks.length,
                                    longTaskMsInWindow: Math.round(tasks.reduce((sum, t) => sum + t.duration, 0)),
                                });
                            }
                        }, 50);
                    };
                    tick();
                }),
        );

        // First real interaction: click the first LHN row, measure event dispatch -> next painted frame.
        let clickToFrameMs = null;
        const row = page.locator('[data-testid="lhn-options-list"] [role="button"]').first();
        if (await row.isVisible().catch(() => false)) {
            clickToFrameMs = await page.evaluate(
                () =>
                    new Promise((resolve) => {
                        const rowEl = document.querySelector('[data-testid="lhn-options-list"] [role="button"]');
                        if (!rowEl) {
                            resolve(null);
                            return;
                        }
                        const t0 = performance.now();
                        rowEl.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, view: window}));
                        requestAnimationFrame(() => requestAnimationFrame(() => resolve(Math.round((performance.now() - t0) * 10) / 10)));
                    }),
            );
        }

        const result = {label, run, throttle, flip: flipEnabled, ...sampling, clickToFrameMs, timestamp: new Date().toISOString()};
        fs.writeFileSync(path.join(RESULTS_DIR, `${label}-x${throttle}-run${run}.json`), JSON.stringify(result, null, 2));
        console.log(
            `  run${run}: lagP50=${result.lagP50}ms lagP95=${result.lagP95}ms lagMax=${result.lagMax}ms longTasks=${result.longTaskMsInWindow}ms/${result.longTasksInWindow} clickToFrame=${clickToFrameMs}ms`,
        );
        await context.close();
    }
}

// Cautious sign-in for an EXISTING account: email + magic code only, zero other clicks.
async function commandLoginCode() {
    const email = arg('email', '');
    const code = arg('code', '000000');
    if (!email) {
        console.error('need --email');
        process.exit(1);
    }
    const context = await launch();
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(APP_URL, {waitUntil: 'domcontentloaded'});
    await page.waitForTimeout(8000);
    const emailInput = page.locator('input#username, input[name="username"], input[type="email"], input[aria-label*="email" i], input[aria-label*="Phone" i]').first();
    await emailInput.fill(email);
    await emailInput.press('Enter');
    await page.waitForTimeout(6000);
    await page.screenshot({path: path.join(SHOTS_DIR, 'real-01-after-email.png')}).catch(() => {});
    const codeInput = page.locator('input[autocomplete="one-time-code"], input[name="validateCode"], input[inputmode="numeric"]').first();
    if (await codeInput.isVisible().catch(() => false)) {
        await codeInput.fill(code);
        await page.waitForTimeout(12000);
    } else {
        console.log('no code input visible — check real-01 screenshot');
    }
    await page.screenshot({path: path.join(SHOTS_DIR, 'real-02-after-code.png')}).catch(() => {});
    const state = await page.evaluate(() => ({url: location.pathname, lhn: performance.getEntriesByName('LHN:getReportsToDisplay', 'measure').length}));
    console.log(JSON.stringify(state));
    await context.close();
}

const command = process.argv[2];
const commands = {
    login: commandLogin,
    seed: commandSeed,
    'seed-real': commandSeedRealistic,
    measure: commandMeasure,
    report: commandReport,
    'buffer-check': commandBufferCheck,
    'lhn-check': commandLhnCheck,
    'search-check': commandSearchCheck,
    'interact-check': commandInteractCheck,
    'login-code': commandLoginCode,
};
if (!commands[command]) {
    console.error(`Unknown command: ${command}. Use: login | seed | measure | report`);
    process.exit(1);
}
await commands[command]();
