/**
 * Quick live check: open a seeded profile, enable the SQLite buffer, let the echo mirror populate,
 * and dump row counts + samples for the buffered tables (incl. the newly added heavy collections).
 *   node scripts-local/verify-tables.mjs --profile bench
 */
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(__dirname, 'harness', 'package.json'));
const {chromium} = require('playwright-core');

const arg = (name, fallback) => {
    const i = process.argv.indexOf(`--${name}`);
    return i === -1 ? fallback : process.argv[i + 1];
};
const PROFILE_DIR = path.join(__dirname, arg('profile', '.pw-profile'));
const APP_URL = arg('url', process.env.HARNESS_APP_URL || 'http://localhost:8080');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    executablePath: CHROME,
    headless: false,
    viewport: {width: 1200, height: 800},
    ignoreHTTPSErrors: APP_URL.startsWith('https:'),
    args: ['--disable-extensions', '--no-first-run', '--no-default-browser-check'],
    serviceWorkers: 'block',
});
const page = context.pages()[0] ?? (await context.newPage());
await page.addInitScript(`try { localStorage.setItem('sqliteBufferEnabled','true'); localStorage.setItem('sqliteBufferFlip','false'); } catch(e){}`);
// Defeat the stale-bundle trap: unregister any Workbox SW (on-disk caches were cleared already).
await page.addInitScript(`navigator.serviceWorker?.getRegistrations?.().then(rs => rs.forEach(r => r.unregister())).catch(()=>{});`);
await page.goto(`${APP_URL}/inbox`, {waitUntil: 'domcontentloaded'});

// Wait for the buffer to exist and the mirror to flush the bulk of the seeded data (fresh OPFS db
// gets fully repopulated from the seeded IndexedDB, ~60k actions — give it room).
await page.waitForFunction(() => !!window.__sqliteBuffer, {timeout: 60000}).catch(() => {});
await page.waitForTimeout(25000);

const result = await page.evaluate(async () => {
    const buffer = window.__sqliteBuffer;
    if (!buffer) {
        return {error: 'window.__sqliteBuffer missing'};
    }
    const schemaTables = (await buffer.query(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)).rows?.map((r) => r.name) ?? [];
    const count = async (table) => (await buffer.query(`SELECT COUNT(*) AS n FROM ${table}`)).rows?.[0]?.n ?? 'ERR';
    const tables = ['reports', 'report_actions', 'transactions', 'report_attributes', 'drafts', 'rnvp', 'policies', 'personal_details', 'transaction_violations', 'fts'];
    const counts = {};
    for (const t of tables) counts[t] = await count(t);

    // New generated columns actually project?
    const policySample = (await buffer.query(`SELECT id, policyName, policyType FROM policies WHERE policyName IS NOT NULL LIMIT 2`)).rows;
    const contactSample = (await buffer.query(`SELECT id, login, displayName FROM personal_details WHERE login IS NOT NULL LIMIT 2`)).rows;
    // Contact FTS works?
    const contactSearch = await buffer.search('fake', 5);
    const contactHits = (contactSearch.results ?? []).filter((r) => r.kind === 'contact').length;

    return {schemaTables, counts, policySample, contactSample, contactHits, initError: (await buffer.stats()).initError};
});

console.log(JSON.stringify(result, null, 2));
await context.close();
