import {useRef} from 'react';
import type {StableArrayConfig} from '@src/utils/replaceEqualDeep';
import replaceEqualDeep from '@src/utils/replaceEqualDeep';

/**
 * Returns a structurally-stable version of `value`:
 * if `value` is deeply equal to the previous result, the previous reference is
 * returned so that downstream memos and callbacks are not needlessly invalidated.
 *
 * Pattern ported from TanStack Query's structural-sharing implementation.
 *
 * @param value The value to stabilize
 * @param config Optional configuration for array key-based matching. When provided,
 *               arrays are matched by the specified key field on their items instead of by index.
 *               Useful for arrays with stable identity keys like 'keyForList'.
 */
function useStableValue<T>(value: T, config?: StableArrayConfig): T {
    'use no memo';

    const ref = useRef(value);
    // eslint-disable-next-line react-hooks/refs
    const stable = replaceEqualDeep(ref.current, value, 0, config);
    // eslint-disable-next-line react-hooks/refs
    ref.current = stable;
    return stable;
}

export default useStableValue;
