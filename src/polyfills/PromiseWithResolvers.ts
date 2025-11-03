// Polyfill for Promise.withResolvers if not available
if (!('withResolvers' in Promise)) {
    // @ts-expect-error Adding polyfill
    Promise.withResolvers = function <T>() {
        let resolve: (value: T | PromiseLike<T>) => void;
        let reject: (reason?: any) => void;
        const promise = new Promise<T>((res, rej) => {
            resolve = res;
            reject = rej;
        });
        return {
            promise,
            resolve: resolve!,
            reject: reject!,
        };
    };
}