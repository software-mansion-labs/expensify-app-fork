import type {OnyxCollectionKey} from '@src/ONYXKEYS';

import type {OnyxCollection} from 'react-native-onyx';

import {useEffect, useMemo, useState} from 'react';
import {registerQueryWatcher} from 'react-native-onyx/dist/OnyxQuery';
import OnyxUtils from 'react-native-onyx/dist/OnyxUtils';

const EMPTY_MAP: Record<string, never> = {};

// Module-level cast helpers: a generic `as TValue` assertion INSIDE the hook makes the OXC React
// Compiler skip the whole file (babel/oxc memoization divergence), so the untyped boundaries are
// narrowed here instead.
function castMember<TValue>(value: unknown): TValue | undefined {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- members of the hook's collectionKey always hold TValue
    return (value ?? undefined) as TValue | undefined;
}

function fetchMember(memberKey: string): Promise<unknown> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- keys are built from a collection prefix; OnyxCollectionKey is their refinement
    return OnyxUtils.get(memberKey as OnyxCollectionKey);
}

/**
 * Live member map for exactly the given IDs of a collection (lazy-Onyx POC): targeted member reads
 * kept fresh by a write watcher scoped to those IDs — never a whole-collection subscription. The
 * returned map is keyed by FULL member key (same shape as an OnyxCollection).
 */
function useMemberMap<TValue>(collectionKey: OnyxCollectionKey, ids: Array<string | undefined>): NonNullable<OnyxCollection<TValue>> {
    const idsSignature = useMemo(() => [...new Set(ids.filter((id): id is string => !!id))].sort().join(','), [ids]);

    // Loading is modeled as "the loaded signature matches the requested one" (no sync setState in the effect).
    const [loaded, setLoaded] = useState<{signature: string; members: NonNullable<OnyxCollection<TValue>>}>({signature: '', members: EMPTY_MAP});

    useEffect(() => {
        if (!idsSignature) {
            return;
        }
        const memberKeys = idsSignature.split(',').map((id) => `${collectionKey}${id}`);
        const memberKeySet = new Set(memberKeys);

        let isCancelled = false;
        Promise.all(memberKeys.map((memberKey) => fetchMember(memberKey).then((value) => [memberKey, castMember<TValue>(value)] as const))).then((entries) => {
            if (isCancelled) {
                return;
            }
            const members: NonNullable<OnyxCollection<TValue>> = {};
            for (const [memberKey, value] of entries) {
                if (value !== undefined) {
                    members[memberKey] = value;
                }
            }
            setLoaded({signature: idsSignature, members});
        });

        const unregisterWatcher = registerQueryWatcher(collectionKey, (key, rawValue) => {
            if (!memberKeySet.has(key)) {
                return;
            }
            const value = castMember<TValue>(rawValue);
            setLoaded((previous) => {
                const nextMembers = {...previous.members};
                if (value !== undefined) {
                    nextMembers[key] = value;
                } else {
                    delete nextMembers[key];
                }
                return {signature: previous.signature, members: nextMembers};
            });
        });

        return () => {
            isCancelled = true;
            unregisterWatcher();
        };
    }, [collectionKey, idsSignature]);

    // Stale-while-revalidate: while a new ID set loads, keep serving the previous members so list
    // consumers never flash empty on a window change.
    return idsSignature ? loaded.members : EMPTY_MAP;
}

export default useMemberMap;
