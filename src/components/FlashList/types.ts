import type {RefObject} from 'react';
import type {FlatList} from 'react-native';

/** Scroll methods the action lists call on their list instance. The native scroll view is only reachable on native lists. */
type ListScrollHandle = Pick<FlatList<unknown>, 'scrollToIndex' | 'scrollToEnd' | 'scrollToOffset'> & Partial<Pick<FlatList<unknown>, 'getNativeScrollRef'>>;

/** Ref to the underlying list instance attached via `ref={}`. */
type FlatListRefType = RefObject<ListScrollHandle | null> | null;

export default FlatListRefType;
export type {ListScrollHandle};
