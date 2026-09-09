import ONYXKEYS from '@src/ONYXKEYS';

/**
 * Echo-mode mirror (MVP stage 1): subscribes to the Onyx collections we buffer and forwards
 * post-merge values to the SQLite worker. Correct by construction — whatever Onyx holds is what
 * lands in the buffer — at the cost of doing the diff on the main thread. Later stages move the
 * merge itself into the worker and this file disappears.
 */
import Onyx from 'react-native-onyx';

import type {BufferEntity, BufferOp} from './protocol';

type PostBatch = (ops: BufferOp[]) => void;

const MIRRORED_COLLECTIONS: Array<{collectionKey: string; entity: BufferEntity}> = [
    {collectionKey: ONYXKEYS.COLLECTION.REPORT, entity: 'report'},
    {collectionKey: ONYXKEYS.COLLECTION.REPORT_ACTIONS, entity: 'reportActions'},
    {collectionKey: ONYXKEYS.COLLECTION.TRANSACTION, entity: 'transaction'},
    {collectionKey: ONYXKEYS.COLLECTION.REPORT_DRAFT_COMMENT, entity: 'draft'},
    {collectionKey: ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS, entity: 'rnvp'},
    {collectionKey: ONYXKEYS.COLLECTION.POLICY, entity: 'policy'},
    {collectionKey: ONYXKEYS.COLLECTION.TRANSACTION_VIOLATIONS, entity: 'transactionViolations'},
];

const mirrorStats = {
    callbacks: 0,
    opsSent: 0,
    diffMs: 0,
};

function getMirrorStats() {
    return {...mirrorStats};
}

function startMirror(postBatch: PostBatch) {
    for (const {collectionKey, entity} of MIRRORED_COLLECTIONS) {
        let previous: Record<string, unknown> = {};

        // connectWithoutView is justified here: this is non-render shadow-ingestion infrastructure
        // (an experiment behind a local flag); there is no component and no useOnyx equivalent for
        // "observe a whole collection outside React".
        Onyx.connectWithoutView({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            key: collectionKey as any,
            callback: (collection: unknown) => {
                const start = performance.now();
                const current = (collection ?? {}) as Record<string, unknown>;
                const ops: BufferOp[] = [];

                // Onyx keeps identities of unchanged collection members stable, so reference
                // comparison finds exactly the changed/added members without deep work.
                for (const [key, value] of Object.entries(current)) {
                    if (value === undefined) {
                        continue;
                    }
                    if (previous[key] !== value) {
                        ops.push({entity, id: key.slice(collectionKey.length), value: value ?? null});
                    }
                }
                for (const key of Object.keys(previous)) {
                    if (!(key in current)) {
                        ops.push({entity, id: key.slice(collectionKey.length), value: null});
                    }
                }

                previous = current;
                mirrorStats.callbacks += 1;
                mirrorStats.diffMs += performance.now() - start;
                if (ops.length === 0) {
                    return;
                }
                mirrorStats.opsSent += ops.length;
                postBatch(ops);
            },
        });
    }

    // Two Onyx keys hold a Record<id, value> under a single key rather than a collection; diff their
    // members so the worker gets one row per member: the derived reportAttributes ({reports: {...}})
    // and personalDetailsList ({accountID: PersonalDetails}, exploded so contacts are queryable).
    // The callback value is typed `unknown` by connectWithoutView, so each selector narrows it.
    /* eslint-disable @typescript-eslint/no-unsafe-type-assertion */
    startRecordKeyMirror(postBatch, ONYXKEYS.DERIVED.REPORT_ATTRIBUTES, 'reportAttributes', (value) => (value as {reports?: Record<string, unknown>} | undefined)?.reports ?? {});
    startRecordKeyMirror(postBatch, ONYXKEYS.PERSONAL_DETAILS_LIST, 'personalDetails', (value) => (value as Record<string, unknown> | undefined) ?? {});
    /* eslint-enable @typescript-eslint/no-unsafe-type-assertion */
}

/**
 * Mirror a single Onyx key that holds a Record<id, value> by diffing its members (reference compare),
 * emitting one op per changed/removed member. Used for derived reportAttributes and personalDetailsList.
 */
function startRecordKeyMirror(postBatch: PostBatch, key: string, entity: BufferEntity, select: (value: unknown) => Record<string, unknown>) {
    let previous: Record<string, unknown> = {};
    Onyx.connectWithoutView({
        // connectWithoutView expects a typed OnyxKey; the buffered keys are passed as strings here.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-type-assertion
        key: key as any,
        callback: (value: unknown) => {
            const start = performance.now();
            const current = select(value);
            const ops: BufferOp[] = [];
            for (const [id, member] of Object.entries(current)) {
                if (member !== undefined && previous[id] !== member) {
                    ops.push({entity, id, value: member ?? null});
                }
            }
            for (const id of Object.keys(previous)) {
                if (!(id in current)) {
                    ops.push({entity, id, value: null});
                }
            }
            previous = current;
            mirrorStats.callbacks += 1;
            mirrorStats.diffMs += performance.now() - start;
            if (ops.length === 0) {
                return;
            }
            mirrorStats.opsSent += ops.length;
            postBatch(ops);
        },
    });
}

export {startMirror, getMirrorStats};
