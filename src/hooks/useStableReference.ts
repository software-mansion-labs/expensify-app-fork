import {useState} from 'react';

/**
 * Keeps returning the previous reference of `value` for as long as `isEqual` says its content has not changed.
 * Absorbs identity churn (fresh inline objects, arrays or elements on every parent render) so that memoized children
 * and compiler-memoized values downstream do not recompute. Uses the "storing information from previous renders"
 * pattern (https://react.dev/reference/react/useState#storing-information-from-previous-renders): a real change costs
 * one extra render pass of the calling component, an unchanged value costs one comparison.
 */
function useStableReference<T>(value: T, isEqual: (previous: T, next: T) => boolean): T {
    const [stable, setStable] = useState(value);
    if (stable === value) {
        return value;
    }
    if (isEqual(stable, value)) {
        return stable;
    }
    setStable(value);
    return value;
}

export default useStableReference;
