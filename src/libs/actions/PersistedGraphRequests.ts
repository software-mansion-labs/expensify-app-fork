import Onyx from 'react-native-onyx';
import ONYXKEYS from '../../ONYXKEYS';
import {Request} from '../../types/onyx';
import { GraphRequest, GraphRequestStorage, GraphRequestStorageEntry } from '../../types/onyx/Request';

let persistedGraphRequests: GraphRequestStorage = {};

Onyx.connect({
    key: ONYXKEYS.PERSISTED_GRAPH_REQUESTS,
    callback: (val) => (persistedGraphRequests = val ?? {}),
});

function log(message: string, ...args: unknown[]) {
    // eslint-disable-next-line no-console
    console.log(`[GraphQueue] ${message}`, ...args);
}

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

        if (parentMessage) {
            log('Added new request to graph:', id, ' (parent:', parentMessage.id, ')')
            parentMessage.children.push(id);
        } else {
            log('Added new request to graph:', id);
        }

        requests[id] = {
            id,
            request,
            children: [],
            isRoot: !parentMessage,
            isProcessed: false,
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
    const toRemove = {
        [id]: {
            ...persistedGraphRequests[id],
            isProcessed: true,
        },
    };
    persistedGraphRequests = Object.assign(persistedGraphRequests, toRemove);
    Onyx.merge(ONYXKEYS.PERSISTED_GRAPH_REQUESTS, toRemove);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function update(oldRequestIndex: number, newRequest: Request) {
    throw new Error('not implemented');
}

function getAll(): GraphRequestStorage {
    return persistedGraphRequests;
}

function getChildrensIDs(parentID: string): string[] {
    return persistedGraphRequests[parentID]?.children ?? [];
}

function getChildrens(parentID: string): GraphRequestStorageEntry[] {
    return getChildrensIDs(parentID).map((id) => persistedGraphRequests[id]).filter(Boolean);
}

function getRootNodes(): GraphRequestStorageEntry[] {
    return Object.values(persistedGraphRequests).filter((request) => request.isRoot);
}

function getNextNodesToProcess(): GraphRequestStorageEntry[] {
    const queue = getRootNodes();
    let result: GraphRequestStorageEntry[] = [];
    while (queue.length) {
        const node = queue.shift();
        if (!node) {
            // eslint-disable-next-line no-continue
            continue;
        }

        if (!node.isProcessed) {
            result = [...result, node];
            // eslint-disable-next-line no-continue
            continue;
        }

        queue.push(...getChildrens(node.id));
    }
    return result;
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

function getAllChildrens(parentID: string): GraphRequestStorageEntry[] {
    const childrens = getChildrens(parentID);
    return childrens.reduce((acc, child) => [...acc, ...getAllChildrens(child.id)], childrens);
}

function clean(id: string) {
    const childrens = getAllChildrens(id);
    const toRemove = childrens.reduce((acc, child) => ({...acc, [child.id]: null}), {});

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
    log('Cleaned root nodes which were processed');
}

export {clear, save, getAll, remove, update, getChildrens, getRootNodes, removeRootNodes, getNextNodesToProcess};


