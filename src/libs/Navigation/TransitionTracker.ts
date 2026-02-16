type CancelHandle = {cancel: () => void};

let activeTransitionCount = 0;
const pendingCallbacks: Array<() => void> = [];

function startTransition(): void {
    activeTransitionCount++;
}

function endTransition(): void {
    activeTransitionCount = Math.max(0, activeTransitionCount - 1);
    if (activeTransitionCount === 0) {
        flushCallbacks();
    }
}

function flushCallbacks(): void {
    while (pendingCallbacks.length > 0) {
        const cb = pendingCallbacks.shift();
        cb?.();
    }
}

function runAfterTransition(callback: () => void): CancelHandle {
    if (activeTransitionCount === 0) {
        let cancelled = false;
        queueMicrotask(() => {
            if (!cancelled) {
                callback();
            }
        });
        return {
            cancel: () => {
                cancelled = true;
            },
        };
    }

    pendingCallbacks.push(callback);
    return {
        cancel: () => {
            const idx = pendingCallbacks.indexOf(callback);
            if (idx !== -1) {
                pendingCallbacks.splice(idx, 1);
            }
        },
    };
}

function isTransitioning(): boolean {
    return activeTransitionCount > 0;
}

export {startTransition, endTransition, runAfterTransition, isTransitioning};
