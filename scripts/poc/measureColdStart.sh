#!/bin/bash
# Lazy-Onyx POC — cold-start measurement harness for the iOS simulator.
#
# Each run restores a pristine copy of the seeded database into the app container, cold-starts the
# app, and captures the telemetry spans the app already logs (via console.debug → os_log). Restoring
# the database per run matters: the app writes to it (queued requests, derived outputs), so without a
# fresh copy run N would measure a database mutated by run N-1.
#
# Usage:
#   scripts/poc/measureColdStart.sh --udid <UDID> --db <path/to/OnyxDB> [--app-id com.expensify.chat.dev]
#                                   [--runs 3] [--label lazy] [--out <dir>] [--timeout 180]

set -uo pipefail

UDID=""
DB=""
APP_ID="com.expensify.chat.dev"
RUNS=3
LABEL="run"
OUT="/tmp/poc-measure"
TIMEOUT=180

while [[ $# -gt 0 ]]; do
    case "$1" in
        --udid) UDID="$2"; shift 2 ;;
        --db) DB="$2"; shift 2 ;;
        --app-id) APP_ID="$2"; shift 2 ;;
        --runs) RUNS="$2"; shift 2 ;;
        --label) LABEL="$2"; shift 2 ;;
        --out) OUT="$2"; shift 2 ;;
        --timeout) TIMEOUT="$2"; shift 2 ;;
        *) echo "Unknown option: $1" >&2; exit 1 ;;
    esac
done

if [[ -z "$UDID" || -z "$DB" ]]; then
    echo "Both --udid and --db are required" >&2
    exit 1
fi
if [[ ! -f "$DB" ]]; then
    echo "Seeded database not found: $DB" >&2
    exit 1
fi

mkdir -p "$OUT"

CONTAINER=$(xcrun simctl get_app_container "$UDID" "$APP_ID" data 2>/dev/null)
if [[ -z "$CONTAINER" ]]; then
    echo "App $APP_ID is not installed on $UDID" >&2
    exit 1
fi
DOCS="$CONTAINER/Documents"
echo "Container: $DOCS" >&2

# The spans worth capturing on the boot path. ManualAppStartup ends at splash hide; OnyxInit and the
# Bootsplash* family isolate the storage/hydration part from the dev-server bundle fetch.
PREDICATE='subsystem == "com.facebook.react.log" AND (eventMessage CONTAINS "Ending span" OR eventMessage CONTAINS "[OnyxBootStats]" OR eventMessage CONTAINS "[ScopedMaterializer]" OR eventMessage CONTAINS "[OnyxDerived]")'

for ((run = 1; run <= RUNS; run++)); do
    RUN_LOG="$OUT/${LABEL}-run${run}.log"
    echo "── run $run/$RUNS ─────────────────────────────" >&2

    xcrun simctl terminate "$UDID" "$APP_ID" >/dev/null 2>&1
    sleep 2

    rm -f "$DOCS/OnyxDB" "$DOCS/OnyxDB-wal" "$DOCS/OnyxDB-shm" "$DOCS/OnyxDB-journal"
    cp "$DB" "$DOCS/OnyxDB"
    echo "seeded $(du -m "$DOCS/OnyxDB" | cut -f1) MB into the container" >&2

    xcrun simctl spawn "$UDID" log stream --level debug --style compact --predicate "$PREDICATE" > "$RUN_LOG" 2>/dev/null &
    STREAM_PID=$!
    sleep 3

    xcrun simctl launch "$UDID" "$APP_ID" >/dev/null 2>&1

    # Wait for the startup span to end (or give up: a dev build fetches its bundle from Metro first).
    WAITED=0
    while (( WAITED < TIMEOUT )); do
        if grep -q "\[Sentry\]\[ManualAppStartup\] Ending span" "$RUN_LOG" 2>/dev/null; then
            break
        fi
        sleep 1
        ((WAITED++))
    done

    # Let the post-ready work (deferred connects, sweeps, census) land in the capture.
    sleep 8
    kill "$STREAM_PID" >/dev/null 2>&1
    wait "$STREAM_PID" 2>/dev/null

    if grep -q "\[Sentry\]\[ManualAppStartup\] Ending span" "$RUN_LOG" 2>/dev/null; then
        echo "captured after ${WAITED}s" >&2
    else
        echo "TIMEOUT after ${WAITED}s — no ManualAppStartup end line (see $RUN_LOG)" >&2
    fi
done

echo >&2
echo "=== spans per run (ms) ===" >&2
for ((run = 1; run <= RUNS; run++)); do
    RUN_LOG="$OUT/${LABEL}-run${run}.log"
    echo "--- run $run"
    grep -oE '\[Sentry\]\[[A-Za-z._0-9]+\] Ending span \([0-9]+ms\)' "$RUN_LOG" 2>/dev/null | sed -E 's/\[Sentry\]\[([A-Za-z._0-9]+)\] Ending span \(([0-9]+)ms\)/\1 \2/' | sort -u
    echo "--- run $run onyx census"
    grep -oE '\[OnyxBootStats\][^$]{0,400}' "$RUN_LOG" 2>/dev/null | head -4
done

echo
echo "Raw captures: $OUT/${LABEL}-run*.log"
