import useEmitComposerScrollEvents from '@hooks/useEmitComposerScrollEvents';

import type {FlashListProps} from '@shopify/flash-list';
import type {NativeScrollEvent, NativeSyntheticEvent} from 'react-native';

import {FlashList as ShopifyFlashList} from '@shopify/flash-list';
import React from 'react';

type FlashListWrapperProps<T> = FlashListProps<T> & {
    /** Whether this list renders report actions next to the composer, so its scrolling suppresses hover effects and tooltips */
    isChatList?: boolean;
};

function FlashList<T>({onScroll: onScrollProp, isChatList = false, ...restProps}: FlashListWrapperProps<T>) {
    const emitComposerScrollEvents = useEmitComposerScrollEvents({enabled: isChatList});

    const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        onScrollProp?.(e);
        // Emit scroll events so that ActiveHoverable can suppress hover effects during scroll
        emitComposerScrollEvents();
    };

    return (
        <ShopifyFlashList<T>
            {...restProps}
            onScroll={handleScroll}
        />
    );
}

export default FlashList;
