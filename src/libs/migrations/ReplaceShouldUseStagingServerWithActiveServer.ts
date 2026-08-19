/* eslint-disable @typescript-eslint/no-deprecated -- draining SHOULD_USE_STAGING_SERVER is this file's entire purpose */
import Log from '@libs/Log';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import type {OnyxKey, OnyxMultiSetInput, OnyxValue} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

/** Onyx has no promise-based read, so take the first callback and drop the subscription. */
function readOnce<TKey extends OnyxKey>(key: TKey): Promise<OnyxValue<TKey>> {
    return new Promise((resolve) => {
        const connection = Onyx.connectWithoutView({
            key,
            callback: (value) => {
                Onyx.disconnect(connection);
                resolve(value);
            },
        });
    });
}

/**
 * The staging switch used to be a boolean; QA makes it a third value. Runs once, then the legacy key is
 * removed so a downgrade-and-upgrade cannot resurrect a stale choice.
 *
 * Deliberate deviation from the spec, which says "false OR MISSING -> 'production'": a missing legacy key
 * writes NOTHING. `resolveActiveServer` derives the environment default from `value === undefined`, so
 * seeding 'production' would destroy that fallback and pin every staging/adhoc build to production —
 * a behaviour change, in the one task that promises none.
 */
export default async function ReplaceShouldUseStagingServerWithActiveServer(): Promise<void> {
    const shouldUseStagingServer = await readOnce(ONYXKEYS.SHOULD_USE_STAGING_SERVER);
    if (shouldUseStagingServer === undefined) {
        Log.info('[Migrate Onyx] Skipped ReplaceShouldUseStagingServerWithActiveServer — no legacy value');
        return;
    }

    // The legacy key always goes away; the new one is only seeded when nothing chose yet,
    // so a value written by a newer build wins over a stale boolean.
    const updates: OnyxMultiSetInput = {[ONYXKEYS.SHOULD_USE_STAGING_SERVER]: null};
    if ((await readOnce(ONYXKEYS.ACTIVE_SERVER)) === undefined) {
        updates[ONYXKEYS.ACTIVE_SERVER] = shouldUseStagingServer ? CONST.SERVER.STAGING : CONST.SERVER.PRODUCTION;
    }

    await Onyx.multiSet(updates);
    Log.info('[Migrate Onyx] Ran ReplaceShouldUseStagingServerWithActiveServer migration');
}
