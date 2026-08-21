import {deferUntilAppReady} from '@libs/deferUntilAppReady';

import type {OnyxKey, OnyxValue} from 'react-native-onyx';

import {useEffect, useState} from 'react';
import Onyx from 'react-native-onyx';
import OnyxUtils from 'react-native-onyx/dist/OnyxUtils';

/**
 * Lazy-Onyx POC: `useOnyx`, but the SUBSCRIPTION is deferred until the app is interactive; until then
 * the hook serves the passively-cached persisted value (eager singletons are in cache from init).
 *
 * Why: subscribing to a derived key counts as its first subscription and starts its engine —
 * hydrating every dependency collection — so an always-mounted consumer (LHN, chat screen) would
 * drag the whole store into RAM during boot. Today's UI shows the persisted last-session value until
 * the engine's first flush anyway; this hook keeps that exact behavior and only shifts the engine
 * start past the interactive mark (where the derived catch-all starts it regardless).
 *
 * Under jest, deferUntilAppReady runs synchronously, so this behaves exactly like a plain subscription.
 */
// Module-level cast helper: a generic `as OnyxValue<TKey>` assertion INSIDE the hook makes the OXC
// React Compiler skip the whole file (babel/oxc memoization divergence), so the untyped boundary is
// narrowed here instead.
function castValue<TKey extends OnyxKey>(value: unknown): OnyxValue<TKey> | undefined {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the cache/connection deliver this key's OnyxValue
    return value as OnyxValue<TKey> | undefined;
}

function useAppReadyOnyxValue<TKey extends OnyxKey>(key: TKey): OnyxValue<TKey> | undefined {
    const [value, setValue] = useState<OnyxValue<TKey> | undefined>(() => castValue<TKey>(OnyxUtils.tryGetCachedValue(key)));

    useEffect(() => {
        const lifecycle: {isCancelled: boolean; connection?: ReturnType<typeof Onyx.connectWithoutView>} = {isCancelled: false};
        deferUntilAppReady(() => {
            if (lifecycle.isCancelled) {
                return;
            }
            // connectWithoutView instead of useOnyx: the subscription must start inside the deferred
            // callback, which a hook call can't do — this hook IS the sanctioned deferred-subscription
            // primitive (see scripts/onyxConnectBypass.ts).
            lifecycle.connection = Onyx.connectWithoutView({
                key,
                callback: (newValue) => {
                    if (lifecycle.isCancelled) {
                        return;
                    }
                    setValue(castValue<TKey>(newValue));
                },
            });
        }, 'low');
        return () => {
            lifecycle.isCancelled = true;
            if (lifecycle.connection) {
                Onyx.disconnect(lifecycle.connection);
            }
        };
    }, [key]);

    return value;
}

export default useAppReadyOnyxValue;
