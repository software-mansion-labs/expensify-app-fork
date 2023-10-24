import Onyx from 'react-native-onyx';
import * as PersistedGraphRequests from '../actions/PersistedGraphRequests';
import * as NetworkStore from './NetworkStore';
import ONYXKEYS from '../../ONYXKEYS';
import * as ActiveClientManager from '../ActiveClientManager';
import * as Request from '../Request';
import * as RequestThrottle from '../RequestThrottle';
import CONST from '../../CONST';
import * as QueuedOnyxUpdates from '../actions/QueuedOnyxUpdates';
import OnyxRequest, { GraphRequest, GraphRequestStorage } from '../../types/onyx/Request';

let resolveIsReadyPromise: ((args?: unknown[]) => void) | undefined;
let isReadyPromise = new Promise((resolve) => {
    resolveIsReadyPromise = resolve;
});

// Resolve the isReadyPromise immediately so that the queue starts working as soon as the page loads
resolveIsReadyPromise?.();

let isGraphQueueRunning = false;
let currentRequest: Promise<void> | null = null;
let isQueuePaused = false;

/**
 * Puts the queue into a paused state so that no requests will be processed
 */
function pause() {
    if (isQueuePaused) {
        return;
    }

    console.debug('[SequentialQueue] Pausing the queue');
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

/**
 * Process any persisted requests, when online, one at a time until the queue is empty.
 *
 * If a request fails due to some kind of network error, such as a request being throttled or when our backend is down, then we retry it with an exponential back off process until a response
 * is successfully returned. The first time a request fails we set a random, small, initial wait time. After waiting, we retry the request. If there are subsequent failures the request wait
 * time is doubled creating an exponential back off in the frequency of requests hitting the server. Since the initial wait time is random and it increases exponentially, the load of
 * requests to our backend is evenly distributed and it gradually decreases with time, which helps the servers catch up.
 */
function process(graphRequestsID?: string[]): Promise<void> {
    // When the queue is paused, return early. This prevents any new requests from happening. The queue will be flushed again when the queue is unpaused.
    if (isQueuePaused) {
        return Promise.resolve();
    }

    console.log('graph: process');

    const persistedRequests = PersistedGraphRequests.getAll();
    if (NetworkStore.isOffline()) {
        return Promise.resolve();
    }

    let toCalculate: string[] = graphRequestsID ?? [];
    if (!toCalculate) {
        toCalculate = Object.values(persistedRequests).filter((request) => request.isRoot).map((request) => request.id);
    }

    for (const id of toCalculate) {
        const requestToProcess = persistedRequests[id];
        // start recursive calls
        Request.processWithMiddleware(requestToProcess.request, true)
            .then((response) => {
                // A response might indicate that the queue should be paused. This happens when a gap in onyx updates is detected between the client and the server and
                // that gap needs resolved before the queue can continue.
                if (response?.shouldPauseQueue) {
                    pause();
                }
                PersistedGraphRequests.remove(id);
                RequestThrottle.clear();
                return process();
            })
            .catch((error) => {
                // On sign out we cancel any in flight requests from the user. Since that user is no longer signed in their requests should not be retried.
                // Duplicate records don't need to be retried as they just mean the record already exists on the server
                if (error.name === CONST.ERROR.REQUEST_CANCELLED || error.message === CONST.ERROR.DUPLICATE_RECORD) {
                    PersistedGraphRequests.remove(id);
                    RequestThrottle.clear();
                    return process();
                }
                return RequestThrottle.sleep()
                    .then(process)
                    .catch(() => {
                        // Onyx.update(requestToProcess.failureData ?? []);
                        PersistedGraphRequests.remove(id);
                        RequestThrottle.clear();
                        return process();
                    });
            });
        }

    return currentRequest;
}

function flush() {
    console.log('graph: flushing the queue');
    if (isQueuePaused) {
        return;
    }

    if (isGraphQueueRunning) {
        return;
    }

    if (!ActiveClientManager.isClientTheLeader()) {
        return;
    }

    isGraphQueueRunning = true;
    isReadyPromise = new Promise((resolve) => {
        resolveIsReadyPromise = resolve;
    });

    const connectionID = Onyx.connect({
        key: ONYXKEYS.PERSISTED_GRAPH_REQUESTS,
        callback: () => {
            Onyx.disconnect(connectionID);
            process().finally(() => {
                isGraphQueueRunning = false;
                resolveIsReadyPromise?.();
                currentRequest = null;
                flushOnyxUpdatesQueue();
            });
        },
    });
}

/**
 * Unpauses the queue and flushes all the requests that were in it or were added to it while paused
 */
function unpause() {
    console.log('graph: unpausing the queue');
}

function isRunning(): boolean {
    return isGraphQueueRunning;
}

// Flush the queue when the connection resumes
NetworkStore.onReconnection(flush);

function push(request: GraphRequest) {
    console.log('push', request);
    // Add request to Persisted Requests so that it can be retried if it fails
    PersistedGraphRequests.save([request]);

    if (request.parentRequestID === undefined) {
        // pass to the global queue
    } else if (!request.parentRequestID.length) {
        // create new root
    } else {
        // add to the parent
    }

    // If we are offline we don't need to trigger the queue to empty as it will happen when we come back online
    if (NetworkStore.isOffline()) {
        return;
    }

    // If the queue is running this request will run once it has finished processing the current batch
    if (isGraphQueueRunning) {
        isReadyPromise.then(flush);
        return;
    }

    flush();
}

function getCurrentRequest(): OnyxRequest | Promise<void> {
    if (currentRequest === null) {
        return Promise.resolve();
    }
    return currentRequest;
}

/**
 * Returns a promise that resolves when the sequential queue is done processing all persisted write requests.
 */
function waitForIdle(): Promise<unknown> {
    return isReadyPromise;
}

export {flush, getCurrentRequest, isRunning, push, waitForIdle, pause, unpause};
