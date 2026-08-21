import ONYXKEYS from '@src/ONYXKEYS';
import type {TransactionViolation} from '@src/types/onyx';

import {useEffect, useMemo, useState} from 'react';
import {registerQueryWatcher} from 'react-native-onyx/dist/OnyxQuery';
import OnyxUtils from 'react-native-onyx/dist/OnyxUtils';

type ViolationsForTransactionIDs = {
    /** Non-empty violation lists keyed by their full Onyx key (`transactionViolations_<id>`). */
    violations: Record<string, TransactionViolation[]>;
    isLoaded: boolean;
};

const EMPTY_VIOLATIONS: Record<string, TransactionViolation[]> = {};

/**
 * Violations for exactly the given transactions, computed on demand (lazy-Onyx POC): targeted member
 * reads instead of a whole-collection or derived-value subscription, kept live by a write watcher
 * scoped to those IDs. Violation values are arrays keyed by transaction ID, so they can't be found by
 * a content query — member reads are the right primitive.
 */
function useViolationsForTransactionIDs(transactionIDs: Array<string | undefined>): ViolationsForTransactionIDs {
    const transactionIDsSignature = useMemo(
        () =>
            transactionIDs
                .filter((transactionID): transactionID is string => !!transactionID)
                .sort()
                .join(','),
        [transactionIDs],
    );

    // Loading is modeled as "the loaded signature matches the requested one" instead of a separate
    // boolean, so a signature change flips isLoaded without any synchronous setState in the effect.
    // The initial state's '' signature makes the empty-ID case loaded immediately, effect-free.
    const [loaded, setLoaded] = useState<{signature: string; violations: Record<string, TransactionViolation[]>}>({signature: '', violations: EMPTY_VIOLATIONS});

    useEffect(() => {
        if (!transactionIDsSignature) {
            return;
        }
        const violationKeyList = transactionIDsSignature.split(',').map((transactionID) => `${ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS}${transactionID}` as const);
        const violationKeys = new Set<string>(violationKeyList);

        let isCancelled = false;
        Promise.all(violationKeyList.map((violationKey) => OnyxUtils.get(violationKey).then((value) => [violationKey, value] as const))).then((entries) => {
            if (isCancelled) {
                return;
            }
            const loadedViolations: Record<string, TransactionViolation[]> = {};
            for (const [key, value] of entries) {
                if (Array.isArray(value) && value.length > 0) {
                    loadedViolations[key] = value as TransactionViolation[];
                }
            }
            setLoaded({signature: transactionIDsSignature, violations: loadedViolations});
        });

        const unregisterWatcher = registerQueryWatcher(ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS, (key, value) => {
            if (!violationKeys.has(key)) {
                return;
            }
            setLoaded((previous) => {
                const nextViolations = {...previous.violations};
                if (Array.isArray(value) && value.length > 0) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the watcher delivers untyped written values; every transactionViolations_ member is a TransactionViolation[]
                    nextViolations[key] = value as TransactionViolation[];
                } else {
                    delete nextViolations[key];
                }
                return {signature: previous.signature, violations: nextViolations};
            });
        });

        return () => {
            isCancelled = true;
            unregisterWatcher();
        };
    }, [transactionIDsSignature]);

    const isLoaded = loaded.signature === transactionIDsSignature;
    return useMemo(() => ({violations: isLoaded ? loaded.violations : EMPTY_VIOLATIONS, isLoaded}), [loaded.violations, isLoaded]);
}

export default useViolationsForTransactionIDs;
export type {ViolationsForTransactionIDs};
