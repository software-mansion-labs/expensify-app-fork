import {deferUntilAppReady} from '@libs/deferUntilAppReady';

import type {OnyxCollectionKey, OnyxCollectionValuesMapping} from '@src/ONYXKEYS';

import type {OnyxCollection, ResultMetadata} from 'react-native-onyx';

import {useEffect, useState} from 'react';
import Onyx from 'react-native-onyx';

/**
 * Lazy-Onyx POC: `useOnyx` for a collection ROOT, but the subscription is deferred until the app is
 * interactive. Under lazy Onyx the first collection-root subscription is what hydrates the WHOLE
 * collection, so an always-mounted consumer (analytics identity, tooltips, promo windows) would drag
 * the full collection into RAM during boot. This hook deliberately still hydrates the whole
 * collection — its consumers genuinely need every member — but only after the interactive mark.
 *
 * Until the deferred subscription delivers, the value is `undefined` and the metadata status is
 * `'loading'` (mirroring the `useOnyx` result shape), so existing `isLoadingOnyxValue` gates keep
 * working: consumers stay in their pre-data state until post-ready.
 *
 * Under jest, deferUntilAppReady runs synchronously, so this behaves like a plain subscription.
 */
type UseAppReadyOnyxCollectionResult<TKey extends OnyxCollectionKey> = [OnyxCollection<OnyxCollectionValuesMapping[TKey]>, ResultMetadata];

// Module-level cast helper: a generic assertion INSIDE the hook makes the OXC React Compiler skip
// the whole file (babel/oxc memoization divergence), so the untyped boundary is narrowed here.
function castCollectionValue<TKey extends OnyxCollectionKey>(value: unknown): OnyxCollection<OnyxCollectionValuesMapping[TKey]> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the connection delivers this collection key's members
    return value as OnyxCollection<OnyxCollectionValuesMapping[TKey]>;
}

function useAppReadyOnyxCollection<TKey extends OnyxCollectionKey>(collectionKey: TKey): UseAppReadyOnyxCollectionResult<TKey> {
    const [value, setValue] = useState<OnyxCollection<OnyxCollectionValuesMapping[TKey]>>(undefined);
    const [metadata, setMetadata] = useState<ResultMetadata>({status: 'loading'});

    useEffect(() => {
        const lifecycle: {isCancelled: boolean; connection?: ReturnType<typeof Onyx.connectWithoutView>} = {isCancelled: false};
        deferUntilAppReady(() => {
            if (lifecycle.isCancelled) {
                return;
            }
            // connectWithoutView instead of useOnyx: the subscription must start inside the deferred
            // callback, which a hook call can't do — this hook is the collection-root counterpart of
            // useAppReadyOnyxValue, the sanctioned deferred-subscription primitive.
            lifecycle.connection = Onyx.connectWithoutView({
                key: collectionKey,
                callback: (newValue) => {
                    if (lifecycle.isCancelled) {
                        return;
                    }
                    // The callback fires even for an empty collection (with undefined), so the
                    // status reliably settles to 'loaded' once the deferred subscription connects.
                    // Keep the metadata object referentially stable across subsequent updates.
                    setValue(castCollectionValue<TKey>(newValue));
                    setMetadata((previous) => (previous.status === 'loaded' ? previous : {status: 'loaded'}));
                },
            });
        }, 'low');
        return () => {
            lifecycle.isCancelled = true;
            if (lifecycle.connection) {
                Onyx.disconnect(lifecycle.connection);
            }
        };
    }, [collectionKey]);

    return [value, metadata];
}

export default useAppReadyOnyxCollection;
