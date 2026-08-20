import Log from './Log';

/**
 * Deferred background work, consolidated (lazy-Onyx POC — see docs-poc/DEFER_IDEA.md).
 *
 * Work registered here runs once the app becomes interactive: the splash screen is hidden AND
 * navigation is ready (wired in SplashScreenStateContext). Three priority queues drain in order,
 * each inside a requestIdleCallback with a forced-run timeout (the GlobalModals pattern), so
 * deferred work never competes with the post-splash frame.
 *
 * Primary POC use case: deferring the ESTABLISHMENT of module-level Onyx subscriptions in
 * interaction-triggered modules — under lazy Onyx, a collection subscription is what triggers
 * hydration, so deferring it keeps those collections off the boot path entirely.
 *
 * A ~10s fallback guarantees the queues are never permanently stranded if the splash never hides
 * (matching the stuck-splash watchdog cadence and GET_INITIAL_URL_TIMEOUT — a shorter fallback
 * would routinely beat the real signal on slow HybridApp boots).
 */
type AppReadyReason = 'splash_hidden' | 'fallback_timeout';
type DeferPriority = 'high' | 'medium' | 'low';

const PRIORITY_ORDER: readonly DeferPriority[] = ['high', 'medium', 'low'];
const FALLBACK_TIMEOUT_MS = 10000;
const IDLE_CALLBACK_TIMEOUT_MS = 2000;

// Under jest there is no splash/navigation, so markAppReady would never fire and every deferred
// callback (module connects, derived catch-all) would silently never run — producing order-dependent
// test failures. Deferral is a production-startup optimization, not behavior under test: run
// callbacks synchronously there, restoring the pre-deferral semantics for the whole suite.
const isTestEnvironment = typeof jest !== 'undefined' || process.env.NODE_ENV === 'test';

/** requestIdleCallback with a safety net for environments without the polyfill loaded. */
const scheduleIdle: typeof requestIdleCallback = typeof requestIdleCallback === 'function' ? requestIdleCallback : (callback) => setTimeout(callback, 0) as unknown as number;

let isReady = false;
let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
const queues: Record<DeferPriority, Array<() => void>> = {
    high: [],
    medium: [],
    low: [],
};

function runCallbackSafely(callback: () => void, priority: DeferPriority) {
    try {
        callback();
    } catch (error) {
        Log.alert('[deferUntilAppReady] Deferred callback threw', {priority, error: String(error)});
    }
}

function drainQueues() {
    // One idle callback per priority tier, chained so higher priorities fully drain first.
    const drainTier = (tierIndex: number) => {
        if (tierIndex >= PRIORITY_ORDER.length) {
            return;
        }
        const priority = PRIORITY_ORDER.at(tierIndex);
        if (!priority) {
            return;
        }
        scheduleIdle(
            () => {
                while (queues[priority].length > 0) {
                    const callback = queues[priority].shift();
                    if (callback) {
                        runCallbackSafely(callback, priority);
                    }
                }
                drainTier(tierIndex + 1);
            },
            {timeout: IDLE_CALLBACK_TIMEOUT_MS},
        );
    };
    drainTier(0);
}

/** Marks the app interactive and drains the queues. Idempotent (StrictMode double effects, fallback racing the real signal). */
function markAppReady(reason: AppReadyReason): void {
    if (isReady) {
        return;
    }
    isReady = true;
    if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = undefined;
    }
    Log.info('[deferUntilAppReady] App marked ready', false, {reason, queued: PRIORITY_ORDER.map((priority) => `${priority}:${queues[priority].length}`).join(' ')});
    drainQueues();
}

/**
 * Defers a callback until the app is interactive. After readiness, callbacks still run through an
 * idle callback (never synchronously) so callers can't accidentally block an interaction.
 */
function deferUntilAppReady(callback: () => void, priority: DeferPriority = 'medium'): void {
    if (isTestEnvironment) {
        runCallbackSafely(callback, priority);
        return;
    }
    if (isReady) {
        scheduleIdle(() => runCallbackSafely(callback, priority), {timeout: IDLE_CALLBACK_TIMEOUT_MS});
        return;
    }
    queues[priority].push(callback);
    if (!fallbackTimer) {
        fallbackTimer = setTimeout(() => {
            Log.alert('[deferUntilAppReady] Fallback timeout fired before the app was marked ready', {timeoutMs: FALLBACK_TIMEOUT_MS});
            markAppReady('fallback_timeout');
        }, FALLBACK_TIMEOUT_MS);
    }
}

export {deferUntilAppReady, markAppReady};
export type {AppReadyReason, DeferPriority};
