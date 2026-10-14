type QuietWindowResult = {
    /** `performance.now()` of the last recorded activity, or undefined when nothing was recorded before the timeout. */
    lastAt: number | undefined;
    count: number;
    hasTimedOut: boolean;
};

type QuietWindow = {
    record: (time: number) => void;
    /** Starts waiting for the quiet window; activity recorded before this only moves the end, it never ends the wait. */
    arm: (fallbackTime: number) => void;
    stop: () => void;
};

const MAX_WAIT_MS = 10_000;

/** Ends at the last activity that is followed by `windowMs` without any, like page activity end in Datadog RUM. `flush` delivers activity still queued before the window closes. */
function createQuietWindow(windowMs: number, onQuiet: (result: QuietWindowResult) => void, flush?: () => void): QuietWindow {
    let lastAt: number | undefined;
    let count = 0;
    let isArmed = false;
    let isDone = false;
    let quietTimer: ReturnType<typeof setTimeout> | undefined;
    let maxWaitTimer: ReturnType<typeof setTimeout> | undefined;

    function stop() {
        isDone = true;
        clearTimeout(quietTimer);
        clearTimeout(maxWaitTimer);
    }

    function finish(hasTimedOut: boolean) {
        if (isDone) {
            return;
        }
        stop();
        onQuiet({lastAt, count, hasTimedOut});
    }

    function restartQuietTimer() {
        clearTimeout(quietTimer);
        quietTimer = setTimeout(() => {
            const countBeforeFlush = count;
            flush?.();
            // Activity the flush delivered restarted the window.
            if (count === countBeforeFlush) {
                finish(false);
            }
        }, windowMs);
    }

    maxWaitTimer = setTimeout(() => finish(true), MAX_WAIT_MS);

    return {
        record: (time) => {
            if (isDone) {
                return;
            }
            count++;
            lastAt = lastAt === undefined ? time : Math.max(lastAt, time);
            if (isArmed) {
                restartQuietTimer();
            }
        },
        arm: (fallbackTime) => {
            if (isDone || isArmed) {
                return;
            }
            isArmed = true;
            lastAt ??= fallbackTime;
            restartQuietTimer();
        },
        stop,
    };
}

export default createQuietWindow;
export type {QuietWindow, QuietWindowResult};
