import {FlashList} from '@shopify/flash-list';
import React, {forwardRef} from 'react';
import type {SectionFlashListProps, SectionFlashListRef} from './types';

function SectionFlashList<ItemT>(props: SectionFlashListProps<ItemT>, ref: SectionFlashListRef<ItemT>) {
    return (
        <FlashList
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...props}
            ref={ref}
        />
    );
}

SectionFlashList.displayName = 'SectionFlashList';

export default forwardRef(SectionFlashList);
