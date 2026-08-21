#!/usr/bin/env bun

/**
 * Lazy-Onyx ratchet (docs-poc/LAZY_ONYX_IMPLEMENTATION_PLAN.md, sustainability):
 * counts bare collection-ROOT subscriptions — `useOnyx(ONYXKEYS.COLLECTION.X)` and
 * `connect/connectWithoutView({key: ONYXKEYS.COLLECTION.X, ...})` — and compares them against the
 * committed baseline. Under lazy Onyx every such subscription forces the whole collection to
 * hydrate, so the count may only go DOWN. Member-key subscriptions (template literals) and
 * queryCollection/useOnyxQuery reads don't count.
 *
 * Usage:
 *   bun scripts/checkBareCollectionSubscriptions.ts            # verify against the baseline
 *   bun scripts/checkBareCollectionSubscriptions.ts --update   # rewrite the baseline (use when a
 *                                                              # migration legitimately lowers counts)
 */
import {execSync} from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const BASELINE_PATH = path.join(ROOT, 'scripts', 'bareCollectionSubscriptionsBaseline.json');

// Bare collection-root subscription patterns. The negative lookahead on `}` skips template-literal
// member keys (`useOnyx(\`${ONYXKEYS.COLLECTION.X}${id}\`)`), which are exactly what we migrate TO.
const PATTERNS = ['useOnyx\\(ONYXKEYS\\.COLLECTION\\.[A-Z_0-9]+[,)]', 'key: ONYXKEYS\\.COLLECTION\\.[A-Z_0-9]+,'];

type Counts = Record<string, number>;

function collectCounts(): Counts {
    const counts: Counts = {};
    for (const pattern of PATTERNS) {
        let output = '';
        try {
            output = execSync(`git grep -c -E "${pattern}" -- 'src/**/*.ts' 'src/**/*.tsx'`, {cwd: ROOT, encoding: 'utf8'});
        } catch (error) {
            // git grep exits 1 when nothing matches — that's a valid zero-count result.
            if (error && typeof error === 'object' && 'status' in error && error.status === 1) {
                output = 'stdout' in error && typeof error.stdout === 'string' ? error.stdout : '';
            } else {
                throw error;
            }
        }
        for (const line of output.split('\n')) {
            if (!line) {
                continue;
            }
            const [file, countText] = line.split(':');
            counts[file] = (counts[file] ?? 0) + Number(countText);
        }
    }
    return counts;
}

function total(counts: Counts): number {
    return Object.values(counts).reduce((sum, count) => sum + count, 0);
}

const current = collectCounts();

if (process.argv.includes('--update')) {
    fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(current, null, 4)}\n`);
    console.log(`Baseline updated: ${total(current)} bare collection subscriptions across ${Object.keys(current).length} files.`);
    process.exit(0);
}

if (!fs.existsSync(BASELINE_PATH)) {
    console.error(`Baseline file missing (${BASELINE_PATH}). Run with --update to create it.`);
    process.exit(1);
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the baseline file is written exclusively by this script's --update path
const baseline: Counts = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) as Counts;

const regressions: string[] = [];
for (const [file, count] of Object.entries(current)) {
    const allowed = baseline[file] ?? 0;
    if (count > allowed) {
        regressions.push(`${file}: ${count} bare collection subscription(s), baseline allows ${allowed}`);
    }
}

if (regressions.length > 0) {
    console.error('New bare collection-root subscriptions detected (each one forces a whole collection to hydrate under lazy Onyx):\n');
    for (const regression of regressions) {
        console.error(`  ${regression}`);
    }
    console.error('\nSubscribe to member keys, use Onyx.queryCollection/useOnyxQuery, or (module maps) defer via deferUntilAppReady.');
    console.error('If this increase is intentional and reviewed, refresh the baseline with: bun scripts/checkBareCollectionSubscriptions.ts --update');
    process.exit(1);
}

console.log(`OK: ${total(current)} bare collection subscriptions (baseline ${total(baseline)}). The ratchet only goes down.`);
process.exit(0);
