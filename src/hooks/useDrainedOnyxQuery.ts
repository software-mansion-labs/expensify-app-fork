import type {OnyxKey, UseOnyxQueryOptions, UseOnyxQueryResult} from 'react-native-onyx';

import {useEffect} from 'react';
import {useOnyxQuery} from 'react-native-onyx';

/**
 * useOnyxQuery that drains ALL batches instead of stopping at the first window — for consumers that
 * need the complete result set (replacements of whole-map derived values), not an infinite-scroll
 * window. Still fully lazy and live: the indexed query reads only matching rows and the watcher
 * keeps them fresh.
 */
function useDrainedOnyxQuery(collectionKey: OnyxKey, options: UseOnyxQueryOptions): UseOnyxQueryResult & {isComplete: boolean} {
    const result = useOnyxQuery(collectionKey, options);
    const {status, hasMore, loadMore, items} = result;

    useEffect(() => {
        if (status !== 'loaded' || !hasMore) {
            return;
        }
        loadMore();
    }, [status, hasMore, loadMore, items.length]);

    return {...result, isComplete: status === 'loaded' && !hasMore};
}

export default useDrainedOnyxQuery;
