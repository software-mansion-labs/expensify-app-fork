/** `AbortSignal.timeout` is web-only: RN polyfills AbortSignal from `abort-controller`, which has no static `timeout` */
function timeoutSignal(timeoutMS: number): AbortSignal {
    if (typeof AbortSignal.timeout === 'function') {
        return AbortSignal.timeout(timeoutMS);
    }

    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeoutMS);
    return controller.signal;
}

export default timeoutSignal;
