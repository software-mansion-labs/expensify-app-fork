import type {OnyxDerivedKey, OnyxKey} from '@src/ONYXKEYS';

import type {OnyxInput} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

/**
 * Check whether a specific dependency key triggered the current OnyxDerived compute.
 *
 * This reads `triggeredKeys` (every dependency that fired) rather than `sourceValues` (only the ones
 * that produced a non-empty delta), so a dependency cleared to `undefined` — or a collection with no
 * changed members — is still correctly reported as having triggered.
 */
const hasKeyTriggeredCompute = (key: OnyxKey, triggeredKeys: Set<OnyxKey> | undefined): boolean => triggeredKeys?.has(key) ?? false;

/**
 * Set a derived value in Onyx
 * As a performance optimization, it skips the cache check, since derived values are recomputed only when a dependency changes,
 * and the null removal for the configs that opt out of it with `skipNullRemoval`
 */
const setDerivedValue = (key: OnyxDerivedKey, value: OnyxInput<OnyxDerivedKey>, skipNullRemoval = false) =>
    Onyx.set(key, value, {
        skipCacheCheck: true,
        skipNullRemoval,
    });

export {hasKeyTriggeredCompute, setDerivedValue};
