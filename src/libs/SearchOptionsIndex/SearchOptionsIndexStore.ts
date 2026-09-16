import type {Options} from '@libs/OptionsListUtils';
import {registerSessionCleanupCallback} from '@libs/SessionCleanup';

import type {OptionIndex} from './OptionIndex';
import type {SearchOptionsFormatConfig, SearchOptionsIndexInputs} from './types';

import createOptionIndex from './OptionIndex';
import searchOptionIndex from './searchOptionIndex';

type SearchRequest = {
    query: string;
    formatConfig: SearchOptionsFormatConfig;
};

/**
 * The option index of the signed-in account, the query it is answering and that answer.
 *
 * The index lives here rather than in the screen that reads it because it has to outlive that screen: once built,
 * it stays warm for the next time the SearchRouter is opened, and a keystroke then never rebuilds anything. One
 * query is open at a time, which is all the router needs, since only one of it can be mounted.
 */
let index: OptionIndex | undefined;
let request: SearchRequest | undefined;
let options: Options | undefined;

const subscribers = new Set<() => void>();

function notifySubscribers() {
    for (const notifySubscriber of subscribers) {
        notifySubscriber();
    }
}

function answerOpenQuery() {
    if (!index || !request) {
        return;
    }
    options = searchOptionIndex(index, request.query, request.formatConfig);
    notifySubscribers();
}

/** Brings the index up to date with the Onyx snapshots. Feeding the snapshots it already holds costs nothing. */
function feedSearchOptionsIndex(inputs: SearchOptionsIndexInputs) {
    if (!index) {
        index = createOptionIndex(inputs);
    } else if (!index.update(inputs).hasChanged) {
        return;
    }
    // Rows the open query selected from, or could now select, have changed, so its answer is due again.
    answerOpenQuery();
}

/**
 * Opens one query and answers it. An empty query is not a query: it closes the open one instead, so its answer
 * cannot be mistaken for the answer to whatever is typed next.
 */
function requestSearchOptions(query: string, formatConfig: SearchOptionsFormatConfig) {
    if (!query.trim()) {
        if (!request) {
            return;
        }
        request = undefined;
        options = undefined;
        notifySubscribers();
        return;
    }
    request = {query, formatConfig};
    answerOpenQuery();
}

function subscribeToSearchOptions(listener: () => void): () => void {
    subscribers.add(listener);
    return () => {
        subscribers.delete(listener);
    };
}

/** The answer to the open query, or nothing while no query is open or the index has never been fed. */
function getSearchOptionsFromIndex(): Options | undefined {
    return options;
}

function clearSearchOptionsIndex() {
    index = undefined;
    request = undefined;
    options = undefined;
}

// The rows are derived from the signed-in account's data, so they must not outlive the session.
registerSessionCleanupCallback(clearSearchOptionsIndex);

export {clearSearchOptionsIndex, feedSearchOptionsIndex, getSearchOptionsFromIndex, requestSearchOptions, subscribeToSearchOptions};
