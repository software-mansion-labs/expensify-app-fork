import {useCallback, useRef} from 'react';

// These guards exist so once-per-screen work is keyed on data or route identity instead of the effect mount count, which an Activity hide and reveal repeats.
// They are ref backed because a ref survives a hide, while the effect that reads it does not.

/** Returns a stable claim that is true only the first time it is called with a given key. */
function useClaimOnce(): (key: string) => boolean {
    const claimedKeys = useRef<Set<string>>(new Set());

    // The identity has to stay stable because callers list the returned callback in effect dependencies.
    return useCallback((key: string) => {
        if (claimedKeys.current.has(key)) {
            return false;
        }
        claimedKeys.current.add(key);
        return true;
    }, []);
}

// A sentinel is needed because undefined is a value a caller can legitimately apply.
const BEFORE_FIRST_APPLY = Symbol('beforeFirstApply');

/** Returns a stable hasChanged that is true when the value differs from the last recorded one, and records it. */
function useLastApplied(): (value: string | undefined) => boolean {
    const lastAppliedValue = useRef<string | undefined | typeof BEFORE_FIRST_APPLY>(BEFORE_FIRST_APPLY);

    // The identity has to stay stable because callers list the returned callback in effect dependencies.
    return useCallback((value: string | undefined) => {
        if (lastAppliedValue.current === value) {
            return false;
        }
        lastAppliedValue.current = value;
        return true;
    }, []);
}

export {useClaimOnce, useLastApplied};
