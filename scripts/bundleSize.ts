/**
 * Measures the emitted web bundle in `dist/` and writes a JSON summary, or compares two summaries and
 * renders the body of the sticky `## Bundle size` pull request comment.
 *
 * Usage:
 *   node ./scripts/bundleSize.ts [--dist dist] [--out bundle-size.json] [--sha <sha>]
 *   node ./scripts/bundleSize.ts --compare <base.json> <head.json> [--merge-base-sha <sha>] [--baseline-branch <name>]
 *   node ./scripts/bundleSize.ts --no-baseline <head.json> [--baseline-branch <name>]
 *   node ./scripts/bundleSize.ts --assert-same <a.json> <b.json>
 *   node ./scripts/bundleSize.ts --marker
 *
 * This is type-stripping-only TypeScript with no dependency outside `node:`, so Node runs it with no
 * `node_modules` present and the comment workflow needs no `npm ci`. bun runs it too, but bun and Node do
 * not agree on gzip sizes, so every measurement records which one took it - see `MEASURED_WITH`.
 */
import {execSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

type ChunkSizes = {raw: number; gzip: number; initial: boolean};

type BundleSizeReport = {
    sha: string;
    /** Optional because reports written before this field existed are still readable. */
    measuredWith?: string;
    initialJsRaw: number;
    initialJsGzip: number;
    allJsRaw: number;
    allJsGzip: number;
    cssRaw: number;
    cssGzip: number;
    largestChunk: {name: string; raw: number; gzip: number};
    chunks: Record<string, ChunkSizes>;
};

/**
 * Which `main` measurement the head is being compared against, and how it was found.
 *
 * `merge-base` is the intended case. `ancestor` is the honest degradation: the merge base itself has no
 * measurement, so the nearest `main` commit that does stands in, and the comment says which and why.
 * `missing` is no baseline at all, which renders the head's own sizes rather than inventing a delta.
 */
type Baseline = {kind: 'merge-base'; report: BundleSizeReport} | {kind: 'ancestor'; report: BundleSizeReport; mergeBaseSha: string} | {kind: 'missing'};

const GZIP_LEVEL = 9;

/**
 * Hidden HTML comment that identifies the comment this script's output belongs in, so the workflow edits
 * one comment on every push instead of appending a new one. It lives here rather than in the workflow so
 * that the renderer and the poster cannot disagree about it; `--marker` prints it for the workflow to read.
 */
const STICKY_MARKER = '<!-- perf-bundle-size -->';

/** Git's default abbreviation in this repository. Long enough to be unambiguous, short enough to read. */
const SHORT_SHA_LENGTH = 11;

/**
 * Which runtime compressed the bytes, recorded in every report because the answer changes the numbers.
 *
 * Measured on one `dist/` of 94 chunks: raw sizes are identical, and every gzip size differs. bun and Node
 * ship different zlib implementations, and at level 9 they disagree by up to 3,266 B on `main` and 12,617 B
 * across all JavaScript - well above the 1,024 B at which this script promotes a per-chunk row. A baseline
 * measured by one runtime and a head measured by the other would therefore report thousands of bytes of
 * tooling difference as if a pull request had added them, so comparing across runtimes is refused outright.
 *
 * Everything that produces a comparable measurement runs `node`. bun would work equally well as the choice,
 * but Node runs this file with no `node_modules` present, which is what lets the comment workflow skip
 * `npm ci` entirely.
 */
const MEASURED_WITH = process.versions.bun ? `bun ${process.versions.bun}` : `node ${process.version}`;

/** `node v26.5.0` -> `node`. The runtime is what decides the bytes; the version is recorded for a reader. */
function runtimeName(measuredWith: string): string {
    return measuredWith.split(' ').at(0) ?? measuredWith;
}

/**
 * Refuses a comparison that would report a difference in compressors as a difference in code. A report
 * written before this field existed cannot be checked, so it is allowed through with a warning rather than
 * failing every comparison against an artifact that is already on disk.
 */
function assertComparable(a: BundleSizeReport, b: BundleSizeReport): void {
    if (!a.measuredWith || !b.measuredWith) {
        process.stderr.write('One of these measurements does not record which runtime measured it, so gzip sizes cannot be confirmed comparable.\n');
        return;
    }
    if (runtimeName(a.measuredWith) !== runtimeName(b.measuredWith)) {
        throw new Error(
            `These measurements were taken by different runtimes (${a.measuredWith} and ${b.measuredWith}), which compress the same bytes to different sizes. ` +
                'Comparing them would report the compressor as a code change. Re-measure both sides with the same runtime.',
        );
    }
}

/**
 * A per-chunk row is promoted out of the collapsed block only above this. The aggregates are always shown,
 * whatever they moved by.
 */
const CHUNK_HEADLINE_FLOOR_BYTES = 1024;

/** Matches the debug id `sentry-webpack-plugin` injects, and captures the UUID itself. */
const SENTRY_DEBUG_ID = /_sentryDebugIds\[[A-Za-z_$\d]+\]="([\da-f-]{36})"/;

const SENTRY_DEBUG_ID_PLACEHOLDER = '00000000-0000-0000-0000-000000000000';

/** The content hash of the source map, in the `sourceMappingURL` comment at the end of every chunk. */
const SOURCE_MAP_HASH = /(sourceMappingURL=\S*?-)([\da-f]{8,})(\.bundle\.js\.map)/;

/**
 * Two builds of one commit emit the same 94 filenames with different bytes inside them, from two causes
 * that are both per-build identifiers rather than app code:
 *
 * - `sentry-webpack-plugin` injects a fresh random UUID into every chunk, after content hashing.
 * - The source map's own content hash moves with that UUID, and every chunk embeds the map's filename in
 *   its `sourceMappingURL` comment.
 *
 * Both replacements are per-build noise of a fixed length, so raw sizes never saw either one. Gzip did:
 * random hex compresses differently, and measured across all 94 chunks of one build, substituting random
 * debug ids moves a single chunk by up to 10 B and the all-JS gzip total by up to 352 B. Masking both makes
 * gzip reproducible, at the cost of reading a few tens of bytes per chunk below the shipped bytes - a
 * constant offset that is identical on both sides of a comparison, so it cannot move a delta.
 *
 * Only the captured UUID is replaced, so the RFC 4122 namespace constants that appear in vendored UUID
 * libraries (`6ba7b810-9dad-11d1-80b4-00c04fd430c8` and friends) are left alone.
 *
 * latin1 round-trips arbitrary bytes unchanged, and both replacements keep the original length, so the
 * buffer handed to gzip differs from the file in exactly those runs and nowhere else.
 */
function withStableBuildIds(buffer: Buffer): Buffer {
    const text = buffer.toString('latin1');
    const debugId = text.match(SENTRY_DEBUG_ID)?.[1];
    const masked = debugId ? text.replaceAll(debugId, SENTRY_DEBUG_ID_PLACEHOLDER) : text;
    // The map's own hash changes with the debug id it contains, and every chunk embeds that filename in its
    // `sourceMappingURL` comment. Same length, so raw sizes never saw it, but gzip did.
    return Buffer.from(
        masked.replace(SOURCE_MAP_HASH, (full, prefix: string, hash: string, suffix: string) => `${prefix}${'0'.repeat(hash.length)}${suffix}`),
        'latin1',
    );
}

function gzipSize(buffer: Buffer): number {
    return zlib.gzipSync(withStableBuildIds(buffer), {level: GZIP_LEVEL}).length;
}

/**
 * `main-a1b2c3d4.bundle.js` -> `main`, `4821-a1b2c3d4.bundle.js` -> `4821`. Six cache groups have stable
 * names; every other chunk is named by numeric id, which moves whenever the module graph moves.
 */
function chunkName(file: string): string {
    return file.replace(/-[0-9a-f]{8,}\.bundle\.js$/, '').replace(/\.bundle\.js$/, '');
}

/** The scripts `index.html` loads, which is what a browser parses before it can render anything. */
function readInitialScripts(distDir: string): Set<string> {
    const html = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
    const initial = new Set<string>();
    for (const match of html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)) {
        initial.add(path.basename(match[1]));
    }
    return initial;
}

function measure(distDir: string, sha: string): BundleSizeReport {
    // A missing index.html means the build did not emit. Measuring an empty `dist` as 0 B would render as a
    // large improvement, so this is fatal rather than a warning.
    if (!fs.existsSync(path.join(distDir, 'index.html'))) {
        throw new Error(`No index.html in ${distDir}: nothing was built, so there is nothing to measure.`);
    }

    const initialScripts = readInitialScripts(distDir);
    const chunks: Record<string, ChunkSizes> = {};
    let initialJsRaw = 0;
    let initialJsGzip = 0;
    let allJsRaw = 0;
    let allJsGzip = 0;
    let cssRaw = 0;
    let cssGzip = 0;
    let largestChunk = {name: '', raw: 0, gzip: 0};

    for (const file of fs.readdirSync(distDir)) {
        const full = path.join(distDir, file);
        if (!fs.statSync(full).isFile()) {
            continue;
        }
        if (file.endsWith('.css')) {
            const buffer = fs.readFileSync(full);
            cssRaw += buffer.length;
            cssGzip += gzipSize(buffer);
            continue;
        }
        if (!file.endsWith('.bundle.js')) {
            continue;
        }

        const buffer = fs.readFileSync(full);
        const raw = buffer.length;
        const gzip = gzipSize(buffer);
        const initial = initialScripts.has(file);
        chunks[chunkName(file)] = {raw, gzip, initial};

        allJsRaw += raw;
        allJsGzip += gzip;
        if (initial) {
            initialJsRaw += raw;
            initialJsGzip += gzip;
        }
        if (raw > largestChunk.raw) {
            largestChunk = {name: chunkName(file), raw, gzip};
        }
    }

    if (initialJsRaw === 0) {
        throw new Error(`index.html in ${distDir} references no chunk that exists on disk.`);
    }

    return {sha, measuredWith: MEASURED_WITH, initialJsRaw, initialJsGzip, allJsRaw, allJsGzip, cssRaw, cssGzip, largestChunk, chunks};
}

function isReport(value: unknown): value is BundleSizeReport {
    return typeof value === 'object' && value !== null && 'chunks' in value && 'initialJsGzip' in value && 'largestChunk' in value;
}

/** `JSON.parse` returns `any`, so narrow before trusting the shape. */
function readReport(filePath: string): BundleSizeReport {
    const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!isReport(parsed)) {
        throw new Error(`${filePath} is not a bundle size report.`);
    }
    return parsed;
}

function bytes(value: number): string {
    return `${value.toLocaleString('en-US')} B`;
}

function delta(base: number, head: number): string {
    const diff = head - base;
    if (diff === 0) {
        return 'no change';
    }
    const percent = base === 0 ? Infinity : (diff / base) * 100;
    const sign = diff > 0 ? '+' : '';
    return `${sign}${bytes(diff)} (${sign}${percent.toFixed(2)}%)`;
}

/** With no baseline the row is one value wide, so the comment cannot read as a delta of zero. */
function row(label: string, head: number, base?: number): string {
    if (base === undefined) {
        return `| ${label} | ${bytes(head)} |`;
    }
    return `| ${label} | ${bytes(head)} | ${bytes(base)} | ${delta(base, head)} |`;
}

function shortSha(sha: string): string {
    return sha.slice(0, SHORT_SHA_LENGTH);
}

/**
 * States what was measured and what it was measured against, including when that is not the merge base.
 *
 * `branch` is the branch the pull request merges into, which is where baselines come from. It is `main` for
 * every ordinary pull request, but naming it rather than hardcoding it keeps the sentence true for a pull
 * request that targets anything else.
 */
function provenance(head: BundleSizeReport, baseline: Baseline, branch: string): string {
    if (baseline.kind === 'merge-base') {
        return `Measured at \`${shortSha(head.sha)}\`, against \`${branch}\` at \`${shortSha(baseline.report.sha)}\`, this pull request's merge base.`;
    }
    if (baseline.kind === 'ancestor') {
        return (
            `Measured at \`${shortSha(head.sha)}\`, against \`${branch}\` at \`${shortSha(baseline.report.sha)}\`. ` +
            `This pull request's merge base \`${shortSha(baseline.mergeBaseSha)}\` has no measurement, so the comparison uses the nearest \`${branch}\` commit that does, ` +
            `and the change column also carries whatever landed on \`${branch}\` between those two commits.`
        );
    }
    return `Measured at \`${shortSha(head.sha)}\`. No \`${branch}\` measurement resolved, so these are this pull request's own sizes with nothing to compare them against.`;
}

function render(head: BundleSizeReport, baseline: Baseline, branch: string): string {
    const base = baseline.kind === 'missing' ? undefined : baseline.report;
    const stable = Object.keys(head.chunks).filter((name) => !/^\d+$/.test(name));
    // Raw first: it is what the JavaScript engine parses on every load, cached or not, and it is emitted
    // identically by every rebuild. Gzip is what crosses the network on the loads that are not cache hits.
    const headline: string[] = [
        row('initial JS (raw)', head.initialJsRaw, base?.initialJsRaw),
        row('initial JS (gzip)', head.initialJsGzip, base?.initialJsGzip),
        row('all JS (raw)', head.allJsRaw, base?.allJsRaw),
        row('all JS (gzip)', head.allJsGzip, base?.allJsGzip),
    ];
    for (const name of stable) {
        const headChunk = head.chunks[name];
        const baseChunk = base?.chunks[name];
        if (headChunk.initial && baseChunk && Math.abs(headChunk.gzip - baseChunk.gzip) >= CHUNK_HEADLINE_FLOOR_BYTES) {
            headline.push(row(`${name} (gzip)`, headChunk.gzip, baseChunk.gzip));
        }
    }

    const detail: string[] = [];
    for (const name of stable) {
        // With a baseline, a chunk the baseline does not have cannot be compared, so it stays out.
        if (base && !base.chunks[name]) {
            continue;
        }
        detail.push(row(`${name} (gzip)`, head.chunks[name].gzip, base?.chunks[name].gzip));
    }
    detail.push(row('emitted CSS (gzip)', head.cssGzip, base?.cssGzip));
    detail.push(row('largest chunk (raw)', head.largestChunk.raw, base?.largestChunk.raw));

    const notes: string[] = [];
    if (base) {
        const mainMoved = base.chunks.main && head.chunks.main && Math.abs(head.chunks.main.gzip - base.chunks.main.gzip) >= CHUNK_HEADLINE_FLOOR_BYTES;
        const vendorsMoved = base.chunks.vendors && head.chunks.vendors && Math.abs(head.chunks.vendors.gzip - base.chunks.vendors.gzip) >= CHUNK_HEADLINE_FLOOR_BYTES;
        if (vendorsMoved && !mainMoved) {
            notes.push('`vendors` grew while `main` did not, which usually means a dependency changed.');
        }
        if (base.measuredWith && head.measuredWith && base.measuredWith !== head.measuredWith) {
            notes.push(
                `These two builds were measured under different versions (\`${base.measuredWith}\` and \`${head.measuredWith}\`), so a small unexplained gzip move may be the compressor rather than the diff.`,
            );
        }
        if (base.largestChunk.name !== head.largestChunk.name) {
            notes.push(`The largest chunk changed identity (\`${base.largestChunk.name}\` -> \`${head.largestChunk.name}\`), so the largest-chunk row compares two different chunks.`);
        }
    }

    const columns = base ? [`| | this PR | \`${branch}\` | change |`, '|---|---|---|---|'] : ['| | this PR |', '|---|---|'];
    const detailColumns = base ? [`| key | this PR | \`${branch}\` | change |`, '| --- | --- | --- | --- |'] : ['| key | this PR |', '| --- | --- |'];

    return [
        STICKY_MARKER,
        '## Bundle size',
        '',
        provenance(head, baseline, branch),
        '',
        ...columns,
        ...headline,
        '',
        ...(notes.length ? [notes.join('\n'), ''] : []),
        '<details>',
        '<summary>All measured keys</summary>',
        '',
        ...detailColumns,
        ...detail,
        '',
        `Measured with \`npm run build\`, gzip level ${GZIP_LEVEL} under ${head.measuredWith ?? 'an unrecorded runtime'}, with the per-build identifiers held constant so gzip is reproducible. Per-chunk rows below ${bytes(CHUNK_HEADLINE_FLOOR_BYTES)} stay in this block.`,
        '',
        '</details>',
    ].join('\n');
}

/**
 * Compares two measurements of one commit, ignoring only the SHA.
 *
 * Raw and gzip are held to different standards, because the build meets different standards on each. Raw
 * bytes are emitted identically by every build measured so far - cold cache against warm, and two separate
 * runners - so any raw difference is a real finding and fails.
 *
 * Gzip carries an irreducible wobble of a byte or two. With the per-build identifiers masked, what is left
 * is rspack emitting a star re-export's name list in a different order between builds: the same strings,
 * the same total length, so raw cannot see it, but the permutation compresses differently. That is real
 * emitted content, so the script reports it rather than hiding it, and only fails when it grows past the
 * threshold the comment itself uses to promote a row - above that it could change what an author reads.
 */
function assertSame(aPath: string, bPath: string): void {
    const a = readReport(aPath);
    const b = readReport(bPath);
    assertComparable(a, b);
    const failures: string[] = [];
    const withinFloor: string[] = [];

    /** Gzip differences below the comment's own reporting threshold cannot change what the comment says. */
    const record = (line: string, difference: number, isGzip: boolean) => {
        if (isGzip && Math.abs(difference) < CHUNK_HEADLINE_FLOOR_BYTES) {
            withinFloor.push(line);
            return;
        }
        failures.push(line);
    };

    const scalars = ['initialJsRaw', 'initialJsGzip', 'allJsRaw', 'allJsGzip', 'cssRaw', 'cssGzip'] as const;
    for (const key of scalars) {
        if (a[key] === b[key]) {
            continue;
        }
        const difference = b[key] - a[key];
        record(`${key}: ${bytes(a[key])} -> ${bytes(b[key])} (${difference > 0 ? '+' : ''}${difference} B)`, difference, key.endsWith('Gzip'));
    }
    if (a.largestChunk.name !== b.largestChunk.name) {
        failures.push(`largestChunk.name: ${a.largestChunk.name} -> ${b.largestChunk.name}`);
    }

    for (const name of new Set([...Object.keys(a.chunks), ...Object.keys(b.chunks)])) {
        const left = a.chunks[name];
        const right = b.chunks[name];
        if (!left || !right) {
            failures.push(`chunk ${name}: ${left ? 'only in first' : 'only in second'}`);
            continue;
        }
        if (left.raw !== right.raw) {
            failures.push(`chunk ${name}: raw ${left.raw} -> ${right.raw}`);
        }
        if (left.gzip !== right.gzip) {
            record(`chunk ${name}: gzip ${left.gzip} -> ${right.gzip} (${right.gzip - left.gzip > 0 ? '+' : ''}${right.gzip - left.gzip} B)`, right.gzip - left.gzip, true);
        }
    }

    if (withinFloor.length > 0) {
        process.stdout.write(
            `gzip floor, ${withinFloor.length} key(s) below the ${bytes(CHUNK_HEADLINE_FLOOR_BYTES)} reporting threshold:\n${withinFloor.map((line) => `  ${line}`).join('\n')}\n`,
        );
    }
    if (failures.length === 0) {
        process.stdout.write('raw bytes are identical in every measured key, and no gzip key moved past the reporting threshold.\n');
        return;
    }
    process.stdout.write(`FAILED, ${failures.length} key(s) outside the floor:\n${failures.map((line) => `  ${line}`).join('\n')}\n`);
    process.exitCode = 1;
}

function main(): void {
    const argv = process.argv.slice(2);
    // A flag with an empty value counts as absent, so a workflow expression that resolved to nothing falls
    // back to the default rather than rendering the empty string.
    const flag = (name: string): string | undefined => {
        const at = argv.indexOf(name);
        const value = at === -1 ? undefined : argv.at(at + 1);
        if (!value) {
            return undefined;
        }
        return value;
    };

    if (argv.includes('--marker')) {
        process.stdout.write(`${STICKY_MARKER}\n`);
        return;
    }

    const assertAt = argv.indexOf('--assert-same');
    if (assertAt !== -1) {
        const [aPath, bPath] = argv.slice(assertAt + 1, assertAt + 3);
        if (!aPath || !bPath) {
            throw new Error('--assert-same needs two JSON paths');
        }
        assertSame(aPath, bPath);
        return;
    }

    // The branch baselines come from. Defaulted rather than required, because `main` is the answer for
    // every ordinary pull request and a local comparison should not have to say so.
    const baselineBranch = flag('--baseline-branch') ?? 'main';

    const headOnlyPath = flag('--no-baseline');
    if (headOnlyPath) {
        process.stdout.write(`${render(readReport(headOnlyPath), {kind: 'missing'}, baselineBranch)}\n`);
        return;
    }

    const compareAt = argv.indexOf('--compare');
    if (compareAt !== -1) {
        const [basePath, headPath] = argv.slice(compareAt + 1, compareAt + 3);
        if (!basePath || !headPath) {
            throw new Error('--compare needs two JSON paths: <base> <head>');
        }
        const baseReport = readReport(basePath);
        const headReport = readReport(headPath);
        assertComparable(baseReport, headReport);
        // The caller knows the merge base; this script only decides how to describe the baseline it was
        // handed. Omitting the flag asserts that the baseline IS the merge base, which is what a local
        // comparison of two deliberate builds means.
        const mergeBaseSha = flag('--merge-base-sha');
        const baseline: Baseline = !mergeBaseSha || mergeBaseSha === baseReport.sha ? {kind: 'merge-base', report: baseReport} : {kind: 'ancestor', report: baseReport, mergeBaseSha};
        process.stdout.write(`${render(headReport, baseline, baselineBranch)}\n`);
        return;
    }

    const distDir = flag('--dist') ?? 'dist';
    const outPath = flag('--out') ?? 'bundle-size.json';
    const sha = flag('--sha') ?? execSync('git rev-parse HEAD', {encoding: 'utf8'}).trim();

    const report = measure(distDir, sha);
    fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
    process.stdout.write(
        `${outPath}: initial JS ${bytes(report.initialJsGzip)} gzip / ${bytes(report.initialJsRaw)} raw, ` +
            `all JS ${bytes(report.allJsGzip)} gzip, largest chunk ${report.largestChunk.name} ${bytes(report.largestChunk.raw)} raw\n`,
    );
}

main();
