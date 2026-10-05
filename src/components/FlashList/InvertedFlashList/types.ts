import type FlatListRefType from '@components/FlashList/types';

import type {FlashListProps} from '@shopify/flash-list';

type InvertedFlashListProps<T> = FlashListProps<T> & {
    data: T[];
    keyExtractor: (item: T, index: number) => string;

    /** Ref to the underlying list instance. */
    ref: FlatListRefType;
};

export default InvertedFlashListProps;
