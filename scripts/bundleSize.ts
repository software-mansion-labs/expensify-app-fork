/**
 * Measures the emitted web bundle in `dist/` and writes a JSON summary, or compares two summaries and
 * renders the `### Bundle size` section of the `## Performance` pull request comment.
 *
 * Usage:
 *   bun ./scripts/bundleSize.ts [--dist dist] [--out bundle-size.json] [--sha <sha>]
 *   bun ./scripts/bundleSize.ts --compare <base.json> <head.json>
 *   bun ./scripts/bundleSize.ts --assert-same <a.json> <b.json>
 */
import {execSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

type ChunkSizes = {raw: number; gzip: number; initial: boolean};

type BundleSizeReport = {
    sha: string;
    initialJsRaw: number;
    initialJsGzip: number;
    allJsRaw: number;
    allJsGzip: number;
    cssRaw: number;
    cssGzip: number;
    largestChunk: {name: string; raw: number; gzip: number};
    chunks: Record<string, ChunkSizes>;
};

const GZIP_LEVEL = 9;

/**
 * A per-chunk row is promoted out of the collapsed block only above this. The aggregates are always shown,
 * whatever they moved by.
 */
const CHUNK_HEADLINE_FLOOR_BYTES = 1024;

/** Matches the debug id `sentry-webpack-plugin` injects, and captures the UUID itself. */
const SENTRY_DEBUG_ID = /_sentryDebugIds\[[A-Za-z_$\d]+\]="([\da-f-]{36})"/;

const SENTRY_DEBUG_ID_PLACEHOLDER = '00000000-0000-0000-0000-000000000000';

/**
 * `sentry-webpack-plugin` injects a fresh random UUID into every chunk on every build, after content
 * hashing, so two builds of one commit emit the same 94 filenames with different bytes inside them. The UUID
 * is always 36 characters, so raw sizes are unaffected, but random hex compresses differently: measured
 * across all 94 chunks of one build, substituting random debug ids moves a single chunk by up to 10 B and
 * the all-JS gzip total by up to 352 B. Replacing the UUID with a fixed one of the same length before
 * compressing makes gzip reproducible, at the cost of reading 13-45 B per chunk below the shipped bytes -
 * a constant offset that is identical on both sides of a comparison, so it cannot move a delta.
 *
 * Only the captured UUID is replaced, so the RFC 4122 namespace constants that appear in vendored UUID
 * libraries (`6ba7b810-9dad-11d1-80b4-00c04fd430c8` and friends) are left alone.
 *
 * latin1 round-trips arbitrary bytes unchanged, and the replacement is the same length as the UUID, so the
 * buffer handed to gzip differs from the file in exactly those 36-byte runs and nowhere else.
 */
function withStableDebugId(buffer: Buffer): Buffer {
    const text = buffer.toString('latin1');
    const debugId = text.match(SENTRY_DEBUG_ID)?.[1];
    if (!debugId) {
        return buffer;
    }
    return Buffer.from(text.replaceAll(debugId, SENTRY_DEBUG_ID_PLACEHOLDER), 'latin1');
}

function gzipSize(buffer: Buffer): number {
    return zlib.gzipSync(withStableDebugId(buffer), {level: GZIP_LEVEL}).length;
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

    return {sha, initialJsRaw, initialJsGzip, allJsRaw, allJsGzip, cssRaw, cssGzip, largestChunk, chunks};
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

function row(label: string, base: number, head: number): string {
    return `| ${label} | ${bytes(head)} | ${bytes(base)} | ${delta(base, head)} |`;
}

function render(base: BundleSizeReport, head: BundleSizeReport): string {
    const stable = Object.keys(head.chunks).filter((name) => !/^\d+$/.test(name));
    // Raw first: it is what the JavaScript engine parses on every load, cached or not, and it is emitted
    // identically by every rebuild. Gzip is what crosses the network on the loads that are not cache hits.
    const headline: string[] = [
        row('initial JS (raw)', base.initialJsRaw, head.initialJsRaw),
        row('initial JS (gzip)', base.initialJsGzip, head.initialJsGzip),
        row('all JS (raw)', base.allJsRaw, head.allJsRaw),
        row('all JS (gzip)', base.allJsGzip, head.allJsGzip),
    ];
    for (const name of stable) {
        const headChunk = head.chunks[name];
        const baseChunk = base.chunks[name];
        if (headChunk.initial && baseChunk && Math.abs(headChunk.gzip - baseChunk.gzip) >= CHUNK_HEADLINE_FLOOR_BYTES) {
            headline.push(row(`${name} (gzip)`, baseChunk.gzip, headChunk.gzip));
        }
    }

    const detail: string[] = [];
    for (const name of stable) {
        const baseChunk = base.chunks[name];
        if (baseChunk) {
            detail.push(row(`${name} (gzip)`, baseChunk.gzip, head.chunks[name].gzip));
        }
    }
    detail.push(row('emitted CSS (gzip)', base.cssGzip, head.cssGzip));
    detail.push(row('largest chunk (raw)', base.largestChunk.raw, head.largestChunk.raw));

    const notes: string[] = [];
    const mainMoved = base.chunks.main && head.chunks.main && Math.abs(head.chunks.main.gzip - base.chunks.main.gzip) >= CHUNK_HEADLINE_FLOOR_BYTES;
    const vendorsMoved = base.chunks.vendors && head.chunks.vendors && Math.abs(head.chunks.vendors.gzip - base.chunks.vendors.gzip) >= CHUNK_HEADLINE_FLOOR_BYTES;
    if (vendorsMoved && !mainMoved) {
        notes.push('`vendors` grew while `main` did not, which usually means a dependency changed.');
    }
    if (base.largestChunk.name !== head.largestChunk.name) {
        notes.push(`The largest chunk changed identity (\`${base.largestChunk.name}\` -> \`${head.largestChunk.name}\`), so the largest-chunk row compares two different chunks.`);
    }

    return [
        '### Bundle size',
        '',
        '| | this PR | `main` | change |',
        '|---|---|---|---|',
        ...headline,
        '',
        ...(notes.length ? [notes.join('\n'), ''] : []),
        '<details>',
        '<summary>All measured keys</summary>',
        '',
        '| key | this PR | `main` | change |',
        '| --- | --- | --- | --- |',
        ...detail,
        '',
        `Measured with \`npm run build\`, gzip level ${GZIP_LEVEL}, with the Sentry debug id held constant so gzip is reproducible. Per-chunk rows below ${bytes(CHUNK_HEADLINE_FLOOR_BYTES)} stay in this block.`,
        '',
        '</details>',
    ].join('\n');
}

/**
 * Two builds of one commit must produce identical bytes, or every delta this script reports carries an
 * unknown floor. Compares every measured number, ignoring only the SHA.
 */
function assertSame(aPath: string, bPath: string): void {
    const a = readReport(aPath);
    const b = readReport(bPath);
    const differences: string[] = [];

    const scalars = ['initialJsRaw', 'initialJsGzip', 'allJsRaw', 'allJsGzip', 'cssRaw', 'cssGzip'] as const;
    for (const key of scalars) {
        if (a[key] !== b[key]) {
            differences.push(`${key}: ${bytes(a[key])} -> ${bytes(b[key])} (${b[key] - a[key] > 0 ? '+' : ''}${b[key] - a[key]} B)`);
        }
    }
    if (a.largestChunk.name !== b.largestChunk.name) {
        differences.push(`largestChunk.name: ${a.largestChunk.name} -> ${b.largestChunk.name}`);
    }

    for (const name of new Set([...Object.keys(a.chunks), ...Object.keys(b.chunks)])) {
        const left = a.chunks[name];
        const right = b.chunks[name];
        if (!left || !right) {
            differences.push(`chunk ${name}: ${left ? 'only in first' : 'only in second'}`);
            continue;
        }
        if (left.raw !== right.raw || left.gzip !== right.gzip) {
            differences.push(`chunk ${name}: raw ${left.raw} -> ${right.raw}, gzip ${left.gzip} -> ${right.gzip}`);
        }
    }

    if (differences.length === 0) {
        process.stdout.write('identical: both measurements report the same size in every measured key.\n');
        return;
    }
    process.stdout.write(`NOT identical, ${differences.length} differing keys:\n${differences.map((line) => `  ${line}`).join('\n')}\n`);
    process.exitCode = 1;
}

function main(): void {
    const argv = process.argv.slice(2);

    const assertAt = argv.indexOf('--assert-same');
    if (assertAt !== -1) {
        const [aPath, bPath] = argv.slice(assertAt + 1, assertAt + 3);
        if (!aPath || !bPath) {
            throw new Error('--assert-same needs two JSON paths');
        }
        assertSame(aPath, bPath);
        return;
    }

    const compareAt = argv.indexOf('--compare');
    if (compareAt !== -1) {
        const [basePath, headPath] = argv.slice(compareAt + 1, compareAt + 3);
        if (!basePath || !headPath) {
            throw new Error('--compare needs two JSON paths: <base> <head>');
        }
        process.stdout.write(`${render(readReport(basePath), readReport(headPath))}\n`);
        return;
    }

    const distDir = argv.includes('--dist') ? argv[argv.indexOf('--dist') + 1] : 'dist';
    const outPath = argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : 'bundle-size.json';
    const sha = argv.includes('--sha') ? argv[argv.indexOf('--sha') + 1] : execSync('git rev-parse HEAD', {encoding: 'utf8'}).trim();

    const report = measure(distDir, sha);
    fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
    process.stdout.write(
        `${outPath}: initial JS ${bytes(report.initialJsGzip)} gzip / ${bytes(report.initialJsRaw)} raw, ` +
            `all JS ${bytes(report.allJsGzip)} gzip, largest chunk ${report.largestChunk.name} ${bytes(report.largestChunk.raw)} raw\n`,
    );
}

main();
