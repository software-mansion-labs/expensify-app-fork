import type {FlashList, FlashListProps} from '@irisjae/flash-list';
import type {ForwardedRef} from 'react';
import React, {forwardRef} from 'react';
import BaseInvertedFlashList from './BaseInvertedFlashList';

function BaseInvertedFlashListWithRef<T>(props: FlashListProps<T>, ref: ForwardedRef<FlashList<T>>) {
    return (
        <BaseInvertedFlashList
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...props}
            ref={ref}
            // CellRendererComponent={CellRendererComponent}
            /**
             * To achieve absolute positioning and handle overflows for list items, the property must be disabled
             * for Android native builds.
             * Source: https://reactnative.dev/docs/0.71/optimizing-flatlist-configuration#removeclippedsubviews
             */
            removeClippedSubviews={false}
        />
    );
}

BaseInvertedFlashListWithRef.displayName = 'BaseInvertedFlashListWithRef';

export default forwardRef(BaseInvertedFlashListWithRef);
