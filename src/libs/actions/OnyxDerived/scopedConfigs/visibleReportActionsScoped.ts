import {computeReportVisibility} from '@userActions/OnyxDerived/configs/visibleReportActions';
import startScopedMaterializer from '@userActions/OnyxDerived/scopedMaterializer';

import ONYXKEYS from '@src/ONYXKEYS';
import type {Session} from '@src/types/onyx';
import type {VisibleReportActionsDerivedValue} from '@src/types/onyx/DerivedValues';

import type {OnyxEntry} from 'react-native-onyx';

import Onyx from 'react-native-onyx';
import OnyxUtils from 'react-native-onyx/dist/OnyxUtils';

/**
 * Lazy-Onyx POC, scoped-store derived (SOTA step 3): VISIBLE_REPORT_ACTIONS as a write-time
 * materializer. The classic engine subscribed to the whole REPORT_ACTIONS collection — the heaviest
 * data in the store — just to recompute one report's visibility map per change. Scoped: a
 * reportActions_ write recomputes exactly that report's entry from one targeted member read; a
 * session-user change (whisper targeting) sweeps.
 */

const SCOPED_VISIBLE_REPORT_ACTIONS_VERSION = 1;

let session: OnyxEntry<Session>;

async function computeEntry(reportID: string): Promise<Record<string, boolean> | null> {
    const reportActions = await OnyxUtils.get(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${reportID}`);
    if (!reportActions) {
        return null;
    }
    return computeReportVisibility(reportActions, session?.accountID);
}

async function allEntryIDs(): Promise<string[]> {
    const allKeys = await OnyxUtils.getAllKeys();
    const reportIDs: string[] = [];
    for (const key of allKeys) {
        if (typeof key === 'string' && key.startsWith(ONYXKEYS.COLLECTION.REPORT_ACTIONS)) {
            reportIDs.push(key.slice(ONYXKEYS.COLLECTION.REPORT_ACTIONS.length));
        }
    }
    return reportIDs;
}

function applyEntries(entries: Map<string, Record<string, boolean> | null>): void {
    // Read-modify-SET (not merge): a visibility flag that flipped back must drop, and Onyx.merge
    // keeps absent fields.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the derived key always holds a VisibleReportActionsDerivedValue
    const currentValue = (OnyxUtils.tryGetCachedValue(ONYXKEYS.DERIVED.VISIBLE_REPORT_ACTIONS) as VisibleReportActionsDerivedValue | undefined) ?? {};
    const nextValue: VisibleReportActionsDerivedValue = {...currentValue};
    for (const [reportID, entry] of entries) {
        if (entry) {
            nextValue[reportID] = entry;
        } else {
            delete nextValue[reportID];
        }
    }
    Onyx.set(ONYXKEYS.DERIVED.VISIBLE_REPORT_ACTIONS, nextValue);
}

function startVisibleReportActionsScopedMaterializer(): void {
    startScopedMaterializer<Record<string, boolean>>({
        outputKey: ONYXKEYS.DERIVED.VISIBLE_REPORT_ACTIONS,
        version: SCOPED_VISIBLE_REPORT_ACTIONS_VERSION,
        watchCollections: [ONYXKEYS.COLLECTION.REPORT_ACTIONS],
        entryIDsForWrites: (writes) => Promise.resolve(new Set(writes.map((write) => write.key.slice(ONYXKEYS.COLLECTION.REPORT_ACTIONS.length)))),
        allEntryIDs,
        computeEntry,
        applyEntries,
        ensureOutputs: () => {
            Onyx.merge(ONYXKEYS.DERIVED.VISIBLE_REPORT_ACTIONS, {});
        },
        connectTriggers: ({requestSweep}) => {
            let isSessionInitialized = false;
            Onyx.connectWithoutView({
                key: ONYXKEYS.SESSION,
                callback: (value) => {
                    // Whisper visibility targets the current user, so a user change re-evaluates everything.
                    const hasUserChanged = isSessionInitialized && value?.accountID !== session?.accountID;
                    session = value;
                    isSessionInitialized = true;
                    if (hasUserChanged) {
                        requestSweep('session user changed');
                    }
                },
            });
        },
    });
}

export default startVisibleReportActionsScopedMaterializer;
