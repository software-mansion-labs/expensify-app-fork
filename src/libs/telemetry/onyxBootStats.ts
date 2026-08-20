import Log from '@libs/Log';

import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';
import OnyxCache from 'react-native-onyx/dist/OnyxCache';

/**
 * Boot-time Onyx measurement for the lazy-Onyx POC (see docs-poc/LAZY_ONYX_IMPLEMENTATION_PLAN.md, Phase 0).
 *
 * Two independent tools:
 * 1. A hydration census (`collectOnyxHydrationStats`) — how many keys are resident in the Onyx cache,
 *    bucketed by collection, at a given moment (we sample at splash hide).
 * 2. A dev-only demand recorder — which keys the app actually subscribed to before the splash screen
 *    was hidden, captured from the app-side `useOnyx` wrapper and from `Onyx.connect`/`connectWithoutView`
 *    (via `installOnyxConnectDemandRecorder`). This is the empirical ground truth for choosing the
 *    lazy/eager split.
 */

const COLLECTION_PREFIXES: string[] = Object.values(ONYXKEYS.COLLECTION);

// Key → performance.now() of first demand. Only populated in dev builds and only until sealed.
const demandedKeys = new Map<string, number>();
let isDemandRecordingSealed = false;

function recordOnyxDemand(key: string): void {
    if (!__DEV__ || isDemandRecordingSealed || demandedKeys.has(key)) {
        return;
    }
    demandedKeys.set(key, performance.now());
}

/**
 * Wraps `Onyx.connect` and `Onyx.connectWithoutView` so module-level subscriptions are recorded too.
 * Call once, right after `Onyx.init`. Connections established during module evaluation that happens
 * before app setup runs are not captured — acceptable for a census tool; with inline requires enabled
 * almost all library modules evaluate after setup.
 */
function installOnyxConnectDemandRecorder(): void {
    if (!__DEV__) {
        return;
    }
    // This is dev-only telemetry instrumentation wrapping the library functions to observe which keys
    // get subscribed — not a data subscription itself, so the no-onyx-connect rule does not apply.
    // The casts keep the library's generic signatures intact for callers (a plain wrapper cannot express them).
    // eslint-disable-next-line rulesdir/no-onyx-connect
    const originalConnect = Onyx.connect;
    const originalConnectWithoutView = Onyx.connectWithoutView;
    // eslint-disable-next-line rulesdir/no-onyx-connect, @typescript-eslint/no-unsafe-type-assertion
    Onyx.connect = ((mapping: Parameters<typeof Onyx.connect>[0]) => {
        recordOnyxDemand(String(mapping.key));
        return originalConnect(mapping);
    }) as typeof Onyx.connect;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    Onyx.connectWithoutView = ((mapping: Parameters<typeof Onyx.connectWithoutView>[0]) => {
        recordOnyxDemand(String(mapping.key));
        return originalConnectWithoutView(mapping);
    }) as typeof Onyx.connectWithoutView;
}

/**
 * Stops recording and logs the demand census. Called at splash hide — everything demanded up to this
 * point is, by definition, "demanded before the app became interactive".
 */
function sealAndReportOnyxBootDemand(): void {
    if (!__DEV__ || isDemandRecordingSealed) {
        return;
    }
    isDemandRecordingSealed = true;

    const collectionRoots: string[] = [];
    const perCollectionMemberCounts = new Map<string, number>();
    let singletonCount = 0;
    for (const key of demandedKeys.keys()) {
        const collectionPrefix = COLLECTION_PREFIXES.find((prefix) => key.startsWith(prefix));
        if (!collectionPrefix) {
            singletonCount++;
            continue;
        }
        if (key === collectionPrefix) {
            collectionRoots.push(key);
            continue;
        }
        perCollectionMemberCounts.set(collectionPrefix, (perCollectionMemberCounts.get(collectionPrefix) ?? 0) + 1);
    }

    const report = {
        totalDemandedKeys: demandedKeys.size,
        singletonCount,
        collectionRootSubscriptions: collectionRoots.sort(),
        memberKeyCountsByCollection: Object.fromEntries([...perCollectionMemberCounts.entries()].sort((a, b) => b[1] - a[1])),
    };
    console.debug('[OnyxBootStats] Demand before splash hide', report);
    Log.info('[OnyxBootStats] Demand before splash hide', false, report);
}

type OnyxHydrationStats = {
    totalKeys: number;
    hydratedKeys: number;
    topCollections: Record<string, number>;
};

/**
 * Counts keys known to the Onyx cache and how many of them have a resident value. Today (eager init)
 * total ≈ hydrated; under lazy hydration the gap is the not-yet-loaded tail. Byte-level accounting
 * lands in Phase 2 at the storage provider (free from raw valueJSON lengths) — stringifying the whole
 * cache here would itself distort the measurement.
 */
function collectOnyxHydrationStats(): OnyxHydrationStats {
    const allKeys = OnyxCache.getAllKeys();
    const perCollectionCounts = new Map<string, number>();
    let hydratedKeys = 0;
    for (const key of allKeys) {
        if (OnyxCache.hasCacheForKey(key)) {
            hydratedKeys++;
        }
        const separatorIndex = key.lastIndexOf('_');
        if (separatorIndex <= 0) {
            continue;
        }
        const prefix = key.slice(0, separatorIndex + 1);
        perCollectionCounts.set(prefix, (perCollectionCounts.get(prefix) ?? 0) + 1);
    }

    const topCollections = Object.fromEntries([...perCollectionCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15));
    return {totalKeys: allKeys.size, hydratedKeys, topCollections};
}

export {recordOnyxDemand, installOnyxConnectDemandRecorder, sealAndReportOnyxBootDemand, collectOnyxHydrationStats};
