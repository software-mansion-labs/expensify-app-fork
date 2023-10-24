import Onyx from 'react-native-onyx';
import ONYXKEYS from '../../ONYXKEYS';
import {Request} from '../../types/onyx';
import { GraphRequest, GraphRequestStorage, GraphRequestStorageEntry } from '../../types/onyx/Request';

let persistedGraphRequests: GraphRequestStorage = {};

Onyx.connect({
    key: ONYXKEYS.PERSISTED_GRAPH_REQUESTS,
    callback: (val) => (persistedGraphRequests = val ?? {}),
});

/**
 * This promise is only used by tests. DO NOT USE THIS PROMISE IN THE APPLICATION CODE
 */
function clear() {
    return Onyx.set(ONYXKEYS.PERSISTED_GRAPH_REQUESTS, null);
}

let lastID = 0;

function generateID(): string {
    lastID += 1;
    return `${lastID}`;
}

// returns id of the requests that were saved
function save(requestsToPersist: GraphRequest[]): string[] {
    const requests: GraphRequestStorage = {};
    for (const request of requestsToPersist) {
        const {parentRequestID} = request;
        const id = generateID();

        const parentMessage = parentRequestID && persistedGraphRequests[parentRequestID];
        console.log('parentMessage', parentMessage, parentRequestID, persistedGraphRequests[parentRequestID])
        if (parentMessage) {
            console.log('adding parent message', id);
            requests[id] = {
                id,
                request,
                children: [],
                isRoot: false,
                isProcessed: false,
            }
            parentMessage.children.push(id);
        } else {
            requests[id] = {
                id,
                request,
                children: [],
                isRoot: true,
                isProcessed: false,
            }
        }
    }

    persistedGraphRequests = Object.assign(persistedGraphRequests, requests);
    Onyx.merge(ONYXKEYS.PERSISTED_GRAPH_REQUESTS, requests);
    return Object.keys(requests);
}



function remove(id: string) {
    /**
     * We only remove the first matching request because the order of requests matters.
     * If we were to remove all matching requests, we can end up with a final state that is different than what the user intended.
     */
    console.log('graph: remove', id);
    const toRemove = {
        [id]: {
            ...persistedGraphRequests[id],
            isProcessed: true,
        },
    };
    persistedGraphRequests = Object.assign(persistedGraphRequests, toRemove);
    console.log('after remove', persistedGraphRequests);
    Onyx.merge(ONYXKEYS.PERSISTED_GRAPH_REQUESTS, toRemove);
}

function update(oldRequestIndex: number, newRequest: Request) {
    console.log('graph: update', oldRequestIndex, newRequest);
}

function getAll(): GraphRequestStorage {
    return persistedGraphRequests;
}

function getChildrensIDs(parentID: string): string[] {
    return persistedGraphRequests[parentID]?.children ?? [];
}

function getChildrens(parentID: string): GraphRequestStorageEntry[] {
    return getChildrensIDs(parentID).map((id) => persistedGraphRequests[id]);
}

function getRootNodes(): GraphRequestStorageEntry[] {
    return Object.values(persistedGraphRequests).filter((request) => request.isRoot);
}

function canRemoveRootNode(rootNode: GraphRequestStorageEntry): boolean {
    // using bfs check if all children are processed
    const queue = [rootNode];
    while (queue.length) {
        const node = queue.shift();
        if (!node) {
            // eslint-disable-next-line no-continue
            continue;
        }

        if (!node.isProcessed) {
            return false;
        }

        queue.push(...getChildrens(node.id));
    }
    return true;
}

function clean(id: string) {
    const toRemove = {
        [id]: null,
    };

    persistedGraphRequests = Object.assign(persistedGraphRequests, toRemove);

    Onyx.merge(ONYXKEYS.PERSISTED_GRAPH_REQUESTS, toRemove);
}

function removeRootNodes() {
    const rootNodes = getRootNodes();
    for (const rootNode of rootNodes) {
        if (canRemoveRootNode(rootNode)) {
            clean(rootNode.id);
        }
    }
}

export {clear, save, getAll, remove, update, getChildrens, getRootNodes, removeRootNodes};
