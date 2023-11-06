import Onyx from 'react-native-onyx';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import {GraphRequest, GraphRequestStorageEntry} from '@src/types/onyx/Request';
import * as PersistedGraphRequests from '@userActions/PersistedGraphRequests';
import * as QueuedOnyxUpdates from '@userActions/QueuedOnyxUpdates';
import * as ActiveClientManager from '@libs/ActiveClientManager';
import * as Request from '@libs/Request';
import * as RequestThrottle from '@libs/RequestThrottle';
import * as NetworkStore from './NetworkStore';

let resolveIsReadyPromise: ((args?: unknown[]) => void) | undefined;
let isReadyPromise = new Promise((resolve) => {
    resolveIsReadyPromise = resolve;
});

// Resolve the isReadyPromise immediately so that the queue starts working as soon as the page loads
resolveIsReadyPromise?.();

let isGraphQueueRunning = false;
let isQueuePaused = false;

/**
 * Puts the queue into a paused state so that no requests will be processed
 */
function pause() {
    if (isQueuePaused) {
        return;
    }

    console.debug('[GraphQueue] Pausing the queue');
    isQueuePaused = true;
}

/**
 * Gets the current Onyx queued updates, apply them and clear the queue if the queue is not paused.
 */
function flushOnyxUpdatesQueue() {
    // The only situation where the queue is paused is if we found a gap between the app current data state and our server's. If that happens,
    // we'll trigger async calls to make the client updated again. While we do that, we don't want to insert anything in Onyx.
    if (isQueuePaused) {
        return;
    }
    QueuedOnyxUpdates.flushQueue();
}

function log(message: string, ...args: unknown[]) {
    // eslint-disable-next-line no-console
    console.log(`[GraphQueue] ${message}`, ...args);
}

/**
 * Process any persisted requests, when online, one at a time until the queue is empty.
 *
 * If a request fails due to some kind of network error, such as a request being throttled or when our backend is down, then we retry it with an exponential back off process until a response
 * is successfully returned. The first time a request fails we set a random, small, initial wait time. After waiting, we retry the request. If there are subsequent failures the request wait
 * time is doubled creating an exponential back off in the frequency of requests hitting the server. Since the initial wait time is random and it increases exponentially, the load of
 * requests to our backend is evenly distributed and it gradually decreases with time, which helps the servers catch up.
 */
function process(graphRequests?: GraphRequestStorageEntry[]): Promise<void> {
    // When the queue is paused, return early. This prevents any new requests from happening. The queue will be flushed again when the queue is unpaused.
    if (isQueuePaused || NetworkStore.isOffline()) {
        log('! Stopped - queue paused or offline');
        return Promise.resolve();
    }

    if (graphRequests !== undefined && graphRequests.length === 0) {
        return Promise.resolve();
    }

    const toCalculate: GraphRequestStorageEntry[] = graphRequests ?? PersistedGraphRequests.getNextNodesToProcess();

    const promisesToResolve = [];

    for (const requestToProcess of toCalculate) {
        const {id, request, isProcessed} = requestToProcess;
        if (isProcessed) {
            // eslint-disable-next-line no-continue
            continue;
        }

        // start recursive calls
        const promise = Request.processWithMiddleware(requestToProcess.request, true)
            .then((response) => {
                // A response might indicate that the queue should be paused. This happens when a gap in onyx updates is detected between the client and the server and
                // that gap needs resolved before the queue can continue.
                if (response?.shouldPauseQueue) {
                    pause();
                }
                PersistedGraphRequests.remove(id);
                RequestThrottle.clear();
                const children = PersistedGraphRequests.getChildrens(id);
                log('Processed request', requestToProcess.id, ' -> ', children.map((v) => v.id).join(', '));
                return process(children);
            })
            .catch((error) => {
                // On sign out we cancel any in flight requests from the user. Since that user is no longer signed in their requests should not be retried.
                // Duplicate records don't need to be retried as they just mean the record already exists on the server
                if (error.name === CONST.ERROR.REQUEST_CANCELLED || error.message === CONST.ERROR.DUPLICATE_RECORD) {
                    PersistedGraphRequests.remove(id);
                    RequestThrottle.clear();
                    log('[promise] error');
                    return process([]);
                }
                return RequestThrottle.sleep()
                    .then(() => process(graphRequests))
                    .catch(() => {
                        log('[promise] throttle error');
                        Onyx.update(request.failureData ?? []);
                        PersistedGraphRequests.remove(id);
                        RequestThrottle.clear();
                        return process(PersistedGraphRequests.getChildrens(id));
                    });
            });

        promisesToResolve.push(promise);
    }

    return Promise.allSettled(promisesToResolve)
        .then(() => {})
        .catch(() => {});
}

function flush() {
    if (isQueuePaused) {
        return;
    }

    if (isGraphQueueRunning) {
        return;
    }

    if (!ActiveClientManager.isClientTheLeader()) {
        log('!!!NOT LEADER!!!');
        return;
    }

    log('flush: flusing the queue...');

    isGraphQueueRunning = true;
    isReadyPromise = new Promise((resolve) => {
        resolveIsReadyPromise = resolve;
    });

    const connectionID = Onyx.connect({
        key: ONYXKEYS.PERSISTED_GRAPH_REQUESTS,
        callback: () => {
            Onyx.disconnect(connectionID);
            process().finally(() => {
                log('completed the flush');
                PersistedGraphRequests.removeRootNodes();
                isGraphQueueRunning = false;
                resolveIsReadyPromise?.();
                flushOnyxUpdatesQueue();
            });
        },
    });
}

/**
 * Unpauses the queue and flushes all the requests that were in it or were added to it while paused
 */
function unpause() {
    if (!isQueuePaused) {
        return;
    }
    log(`[GraphQueue] Unpausing the queue and flushing requests`);
    isQueuePaused = false;
    flushOnyxUpdatesQueue();
    flush();
}

function isRunning(): boolean {
    return isGraphQueueRunning;
}

// Flush the queue when the connection resumes
NetworkStore.onReconnection(flush);

// returns the id of the pushed request
function push(request: GraphRequest): string {
    // Add request to Persisted Requests so that it can be retried if it fails
    const requestsIDs: string[] = PersistedGraphRequests.save([request]);
    const requestID = requestsIDs.slice(-1)[0];
    // If we are offline we don't need to trigger the queue to empty as it will happen when we come back online
    if (NetworkStore.isOffline()) {
        return requestID;
    }

    // If the queue is running this request will run once it has finished processing the current batch
    if (isGraphQueueRunning) {
        isReadyPromise.then(flush);
        return requestID;
    }
    flush();
    return requestID;
}

/**
 * Returns a promise that resolves when the sequential queue is done processing all persisted write requests.
 */
function waitForIdle(): Promise<unknown> {
    return isReadyPromise;
}

export {flush, isRunning, push, waitForIdle, pause, unpause, log};
