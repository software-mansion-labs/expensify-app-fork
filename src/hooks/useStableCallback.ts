import {useCallback, useLayoutEffect, useRef} from 'react';

/**
 * Returns a **stable-identity** wrapper around a callback. The returned function
 * reference never changes across renders, but always delegates to the latest
 * version of the callback when invoked.
 *
 * ## How it works
 *
 * 1. The latest callback is stored in a `useRef` and updated via `useLayoutEffect`
 *    (synchronously after DOM commit, before browser paint).
 * 2. A wrapper created once via `useCallback([], [])` delegates to `ref.current`
 *    at **call-time** (not creation-time), so it always executes the most recent logic.
 *
 * This is the "Latest Ref Pattern" recommended by Kent C. Dodds and used in
 * production by Radix UI (`@radix-ui/react-use-callback-ref`), BlueSky, and
 * Sanity.io. The ref is updated in `useLayoutEffect` (not during render) to
 * stay safe under React Concurrent Mode — if React discards a render, the ref
 * still points to the last **committed** callback.
 *
 * ## When to use
 *
 * Use this hook for **event-handler props** passed down to child components when:
 * - The callback closes over frequently-changing data (state, derived values).
 * - The child component does **not** need to re-render when that data changes —
 *   it only needs to invoke the latest logic when the user interacts.
 * - You want to break a "callback cascade" where a parent's unstable callback
 *   propagates re-renders through multiple child layers.
 *
 * ## When NOT to use — important restrictions
 *
 * 1. **Never use as a dependency** in `useEffect`, `useMemo`, or `useCallback`.
 *    The stable identity means the effect/memo will never re-run, even when the
 *    underlying logic changes. This leads to stale behavior that is hard to debug.
 *
 *    ```tsx
 *    // BAD — effect never re-runs:
 *    const stableFn = useStableCallback(fn);
 *    useEffect(() => { subscribe(stableFn); }, [stableFn]);
 *    ```
 *
 * 2. **Never call during render.** The ref is updated in `useLayoutEffect`, so
 *    between render and commit the ref still points to the previous callback.
 *    Calling it during render may execute stale logic. Only call it from event
 *    handlers, timeouts, animation callbacks, or other post-commit contexts.
 *
 *    ```tsx
 *    // BAD — called during render:
 *    const stableFn = useStableCallback(computeValue);
 *    const result = stableFn(); // may return stale result
 *    ```
 *
 * 3. **Do not use for callbacks that affect rendering logic.** If a parent
 *    component needs to re-render children when the callback's closure data
 *    changes (e.g., a `renderItem` that reads selection state), stabilizing the
 *    callback will suppress necessary re-renders.
 *
 * 4. **Do not use for ref callbacks** (`<div ref={...} />`). React ref callbacks
 *    have their own lifecycle and cleanup semantics in React 19+.
 *
 * ## References
 *
 * - Kent C. Dodds, "The Latest Ref Pattern in React"
 *   https://www.epicreact.dev/the-latest-ref-pattern-in-react
 * - Radix UI `useCallbackRef` (production, thousands of dependents)
 *   https://www.npmjs.com/package/@radix-ui/react-use-callback-ref
 * - Matt Rossman, "Non-reactive callbacks in React" (survey of implementations)
 *   https://mattrossman.com/2024/09/30/non-reactive-callbacks-in-react
 * - Vladimir Klepov, "Did I just build a better useCallback?"
 *   https://thoughtspile.github.io/2021/04/07/better-usecallback/
 * - Ayub Begimkulov, "React: Concurrent Mode and Refs" (why useLayoutEffect, not render)
 *   https://ayubbegimkulov.com/concurrent-ref/
 *
 * @param callback The callback to stabilize. May close over any values — the
 *                 latest version is always invoked at call-time.
 * @returns A function with the same signature as `callback` but a stable identity.
 */
function useStableCallback<TArgs extends unknown[], TReturn>(callback: (...args: TArgs) => TReturn): (...args: TArgs) => TReturn {
    'use no memo';

    const ref = useRef(callback);

    // Update after commit, before paint — safe in Concurrent Mode.
    // eslint-disable-next-line react-hooks/refs
    useLayoutEffect(() => {
        ref.current = callback;
    });

    // Wrapper created once — delegates to ref.current at invocation time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useCallback((...args: TArgs) => ref.current(...args), []);
}

export default useStableCallback;
