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

    const [violations, setViolations] = useState<Record<string, TransactionViolation[]>>(EMPTY_VIOLATIONS);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const ids = transactionIDsSignature ? transactionIDsSignature.split(',') : [];
        const violationKeyList = ids.map((transactionID) => `${ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS}${transactionID}` as const);
        const violationKeys = new Set<string>(violationKeyList);

        if (violationKeys.size === 0) {
            setViolations(EMPTY_VIOLATIONS);
            setIsLoaded(true);
            return;
        }

        let isCancelled = false;
        setIsLoaded(false);
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
            setViolations(loadedViolations);
            setIsLoaded(true);
        });

        const unregisterWatcher = registerQueryWatcher(ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS, (key, value) => {
            if (!violationKeys.has(key)) {
                return;
            }
            setViolations((previousViolations) => {
                const nextViolations = {...previousViolations};
                if (Array.isArray(value) && value.length > 0) {
                    nextViolations[key] = value as TransactionViolation[];
                } else {
                    delete nextViolations[key];
                }
                return nextViolations;
            });
        });

        return () => {
            isCancelled = true;
            unregisterWatcher();
        };
    }, [transactionIDsSignature]);

    return useMemo(() => ({violations, isLoaded}), [violations, isLoaded]);
}

export default useViolationsForTransactionIDs;
export type {ViolationsForTransactionIDs};
