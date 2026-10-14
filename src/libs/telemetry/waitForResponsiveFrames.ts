/** Longer frames mean the JS thread is still blocked by the render cascade. */
const RESPONSIVE_FRAME_BUDGET_MS = 32;

/** Two in a row, so a lucky gap between two long tasks does not read as "settled". */
const REQUIRED_HEALTHY_FRAMES = 2;

const MAX_WAIT_MS = 10_000;

type ResponsiveFramesResult = {
    /** `performance.now()` of the frame that opened the healthy streak, i.e. when the last long frame ended. */
    settledAt: number;
    longestFrameMs: number;
    hasTimedOut: boolean;
};

/** Calls back once animation frames run within budget again, or after MAX_WAIT_MS. */
function waitForResponsiveFrames(onSettled: (result: ResponsiveFramesResult) => void): void {
    const startedAt = performance.now();
    let lastFrameAt = startedAt;
    let streakStartedAt = startedAt;
    let healthyFrames = 0;
    let longestFrameMs = 0;

    const onFrame = () => {
        const now = performance.now();
        const frameMs = now - lastFrameAt;
        lastFrameAt = now;
        longestFrameMs = Math.max(longestFrameMs, frameMs);
        if (frameMs <= RESPONSIVE_FRAME_BUDGET_MS) {
            healthyFrames += 1;
        } else {
            healthyFrames = 0;
            streakStartedAt = now;
        }

        const hasTimedOut = now - startedAt >= MAX_WAIT_MS;
        if (healthyFrames < REQUIRED_HEALTHY_FRAMES && !hasTimedOut) {
            requestAnimationFrame(onFrame);
            return;
        }

        onSettled({settledAt: streakStartedAt, longestFrameMs, hasTimedOut});
    };

    requestAnimationFrame(onFrame);
}

export type {ResponsiveFramesResult};
export default waitForResponsiveFrames;
