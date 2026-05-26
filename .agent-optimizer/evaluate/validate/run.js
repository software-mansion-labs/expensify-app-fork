#!/usr/bin/env node
// Single entry point for all CLAUDE.md checks.
//
// Usage (from repo root):
//   node .agent-optimizer/evaluate/validate/run.js                          # structural checks only
//   node .agent-optimizer/evaluate/validate/run.js --eval                   # structural + behavioral eval (single variant)
//   node .agent-optimizer/evaluate/validate/run.js --compare                # structural + A/B comparison (HEAD vs working tree)
//   node .agent-optimizer/evaluate/validate/run.js --compare --baseline <ref>  # use a specific git ref as baseline
//   node .agent-optimizer/evaluate/validate/run.js --no-save                # skip writing results file
//   node .agent-optimizer/evaluate/validate/run.js path/file                # structural check on arbitrary file

const {execFileSync, spawnSync} = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const runEval = args.includes('--eval');
const runCompare = args.includes('--compare');
const fileArg = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--baseline');
const file = fileArg ?? 'CLAUDE.md';
const dir = __dirname;

// ── Structural checks ──────────────────────────────────────────────────────

console.log('── Structural validation ─────────────────────────────────────');

const checks = ['check-length.js', 'check-portability.js', 'check-references.js'];
let structuralFailed = false;

for (const check of checks) {
    try {
        execFileSync('node', [path.join(dir, check), file], {stdio: 'inherit'});
    } catch {
        structuralFailed = true;
    }
}

if (structuralFailed) {
    console.error('\nStructural validation failed. Fix the issues above before running eval.');
    process.exit(1);
}

console.log('\nAll structural checks passed.\n');

if (!runEval && !runCompare) {
    process.exit(0);
}

// ── Behavioral eval or comparison ──────────────────────────────────────────

const mode = runCompare ? 'compare' : 'eval';
const scriptArgs = ['node', path.join(dir, `${mode}.js`)];
if (args.includes('--no-save')) scriptArgs.push('--no-save');
if (runCompare) {
    const baselineIdx = args.indexOf('--baseline');
    if (baselineIdx !== -1) scriptArgs.push('--baseline', args[baselineIdx + 1]);
}

console.log(`── ${runCompare ? 'A/B comparison' : 'Behavioral evaluation'} ${'─'.repeat(runCompare ? 41 : 37)}`);

const result = spawnSync(scriptArgs[0], scriptArgs.slice(1), {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env,
});

process.exit(result.status ?? 1);
