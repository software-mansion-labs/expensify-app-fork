import Onyx from 'react-native-onyx';
import ONYXKEYS from '../../ONYXKEYS';
import {Request} from '../../types/onyx';
import { GraphRequest, GraphRequestStorage } from '../../types/onyx/Request';

let persistedGraphRequests: GraphRequestStorage = {};

type LastMessageInChannelStore = Record<string, string>;

let lastChannelStore: LastMessageInChannelStore = {};

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
    console.log('persistedGraphRequests 0', persistedGraphRequests);
    for (const request of requestsToPersist) {
        if (!request.graphChannelID)  {
            // eslint-disable-next-line no-continue
            continue;
        }
        const lastMessageID = lastChannelStore[request.graphChannelID];
        if (!lastMessageID) {
            console.log('error! lastMessageID doesn\'t exist', lastMessageID);
        }
        const lastMessage = lastMessageID && persistedGraphRequests[lastMessageID];
        const id = generateID();
        console.log('lastMessage', lastMessage);
        if (lastMessage) {
            console.log('persistedGraphRequests 1', persistedGraphRequests);
            const lastMessage = persistedGraphRequests[lastMessageID];
            console.log('using old root with lastMessageID', lastMessageID, lastMessage);
            if (!lastMessage) {
                console.log('lastMessage didn\'t exist!!!');
            }
            requests[id] = {
                id,
                isRoot: false,
                request,
                children: [],
            }
            requests[lastMessageID] = {
                ...persistedGraphRequests[lastMessageID],
                children: [...persistedGraphRequests[lastMessageID].children, id],
            }
        } else {
            console.log('creating new root');
            requests[id] = {
                id,
                isRoot: true,
                request,
                children: [],
            }
        }
        lastChannelStore[request.graphChannelID] = id;
        console.log('updated lastChannelStore', lastChannelStore);
    }
    persistedGraphRequests = Object.assign(persistedGraphRequests, requests);
    console.log('persistedGraphRequests 2', persistedGraphRequests);
    Onyx.merge(ONYXKEYS.PERSISTED_GRAPH_REQUESTS, requests);
    console.log('graph: saved new graph requests', persistedGraphRequests);
    console.log('returning created keys', Object.keys(requests));
    return Object.keys(requests);
}



function remove(id: string) {
    /**
     * We only remove the first matching request because the order of requests matters.
     * If we were to remove all matching requests, we can end up with a final state that is different than what the user intended.
     */
    console.log('graph: remove', id);
    const toRemove = {
        [id]: null,
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

export {clear, save, getAll, remove, update};
