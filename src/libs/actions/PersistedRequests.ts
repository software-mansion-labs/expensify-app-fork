import Onyx from 'react-native-onyx';
import isEqual from 'lodash/isEqual';
import ONYXKEYS from '../../ONYXKEYS';
import {Request} from '../../types/onyx';

let persistedRequests: Request[] = [];

Onyx.connect({
    key: ONYXKEYS.PERSISTED_REQUESTS,
    callback: (val) => (persistedRequests = val ?? []),
});

/**
 * This promise is only used by tests. DO NOT USE THIS PROMISE IN THE APPLICATION CODE
 */
function clear() {
    return Onyx.set(ONYXKEYS.PERSISTED_REQUESTS, []);
}

function save(requestsToPersist: Request[]) {
    console.log('save', requestsToPersist);
    let requests: Request[] = [];

    // Remove from requestsToPersist any requests that have the same indepodenceKey as the requestsToPresist
    const filteredRequestsToPersist = persistedRequests.filter((persistedRequest) => {
        const index = requestsToPersist.findIndex((requestToPersist) => isEqual(requestToPersist, persistedRequest));
        if (index === -1) {
            return true;
        }
        requestsToPersist.splice(index, 1);
        return false;
    });


    if (persistedRequests.length) {
        requests = filteredRequestsToPersist.concat(requestsToPersist);
    } else {
        requests = requestsToPersist;
    }
    persistedRequests = requests;
    Onyx.set(ONYXKEYS.PERSISTED_REQUESTS, requests);
}

function remove(requestToRemove: Request) {
    /**
     * We only remove the first matching request because the order of requests matters.
     * If we were to remove all matching requests, we can end up with a final state that is different than what the user intended.
     */
    const requests = [...persistedRequests];
    const index = requests.findIndex((persistedRequest) => isEqual(persistedRequest, requestToRemove));
    if (index === -1) {
        return;
    }
    requests.splice(index, 1);
    persistedRequests = requests;
    Onyx.set(ONYXKEYS.PERSISTED_REQUESTS, requests);
}

function update(oldRequestIndex: number, newRequest: Request) {
    const requests = [...persistedRequests];
    requests.splice(oldRequestIndex, 1, newRequest);
    persistedRequests = requests;
    Onyx.set(ONYXKEYS.PERSISTED_REQUESTS, requests);
}

function getAll(): Request[] {
    return persistedRequests;
}

export {clear, save, getAll, remove, update};
