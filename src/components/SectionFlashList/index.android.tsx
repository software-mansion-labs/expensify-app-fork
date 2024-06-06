import {FlashList} from '@shopify/flash-list';
import React, {forwardRef} from 'react';
import type {SectionFlashListProps, SectionFlashListRef} from './types';

function SectionFlashListWithRef<ItemT>(props: SectionFlashListProps<ItemT>, ref: SectionFlashListRef<ItemT>) {
    return (
        <FlashList
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...props}
            ref={ref}
            // For Android we want to use removeClippedSubviews since it helps manage memory consumption. When we
            // run out memory images stop loading and appear as grey circles
            // eslint-disable-next-line react/jsx-props-no-multi-spaces
            removeClippedSubviews
        />
    );
}

SectionFlashListWithRef.displayName = 'SectionFlashListWithRef';

export default forwardRef(SectionFlashListWithRef);
