#!/usr/bin/env bash
# Autoperf benchmark runner for Expensify App performance optimization
# Runs: typecheck → Reassure perf tests → parse metrics
# Outputs METRIC lines for the agent to parse
# Exit code 0 = all good, non-zero = broken
set -euo pipefail

cd "$(dirname "$0")/.."

TRACK="${1:-sidebar}"

# ── Map track to Reassure test file patterns ────────────────────────
case "$TRACK" in
  sidebar)
    TEST_PATTERN="SidebarLinks\\.perf-test|SidebarUtils\\.perf-test"
    ;;
  search)
    TEST_PATTERN="SearchRouter\\.perf-test|/OptionsListUtils\\.perf-test"
    ;;
  reportactions)
    TEST_PATTERN="ReportActionsList\\.perf-test|ReportActionsUtils\\.perf-test"
    ;;
  utils)
    TEST_PATTERN="/OptionsListUtils\\.perf-test|/ReportUtils\\.perf-test|/PolicyUtils\\.perf-test|/SidebarUtils\\.perf-test"
    ;;
  all)
    TEST_PATTERN="\\.perf-test\\."
    ;;
  *)
    echo "FATAL: unknown track '$TRACK'. Use: sidebar | search | reportactions | utils | all"
    exit 1
    ;;
esac

echo "=== Autoperf: track=$TRACK ==="
echo ""

# ── Step 1: TypeScript (fast gate, ~10x faster than tsc) ───────────
echo "=== TypeCheck (tsgo) ==="
if ! npm run typecheck-tsgo 2>&1; then
  echo "FATAL: typecheck failed"
  exit 1
fi
echo "TypeCheck passed."
echo ""

# ── Step 2: Reassure performance benchmark ──────────────────────────
echo "=== Reassure Performance Benchmark ==="
echo "Test pattern: $TEST_PATTERN"
echo ""

rm -rf .reassure
NODE_OPTIONS=--experimental-vm-modules TEST_RUNNER_ARGS="--runInBand --testMatch '<rootDir>/**/*.perf-test.[jt]s?(x)' --testPathPattern=\"$TEST_PATTERN\"" npx reassure --baseline 2>&1

if [ ! -f .reassure/baseline.perf ]; then
  echo "FATAL: .reassure/baseline.perf not found — Reassure may have crashed"
  exit 1
fi

# ── Step 3: Parse metrics from .reassure/baseline.perf (JSONL) ─────
echo ""
echo "=== Metrics ==="
node -e "
const fs = require('fs');
const lines = fs.readFileSync('.reassure/baseline.perf', 'utf8').split('\n').filter(l => l.trim());
let totalDuration = 0;
let totalCount = 0;
let n = 0;
for (const line of lines) {
  try {
    const entry = JSON.parse(line);
    if (!entry.name || entry.meanDuration == null) continue;
    const name = entry.name.replace(/[\\s\\[\\]]/g, '_');
    console.log('METRIC ' + name + '_duration_ms=' + entry.meanDuration.toFixed(1));
    console.log('METRIC ' + name + '_count=' + entry.meanCount.toFixed(1));
    totalDuration += entry.meanDuration;
    totalCount += entry.meanCount;
    n++;
  } catch (e) {}
}
if (n === 0) {
  console.error('FATAL: no valid entries in baseline.perf');
  process.exit(1);
}
console.log('');
console.log('METRIC total_duration_ms=' + totalDuration.toFixed(1));
console.log('METRIC total_count=' + totalCount.toFixed(1));
console.log('METRIC num_tests=' + n);
"
