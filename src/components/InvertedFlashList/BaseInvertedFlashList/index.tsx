import type {FlashListProps} from '@irisjae/flash-list';
import {FlashList} from '@irisjae/flash-list';
import type {ForwardedRef} from 'react';
import React, {forwardRef, useMemo} from 'react';
import type {ScrollViewProps} from 'react-native';

type BaseInvertedFlashListProps<T> = FlashListProps<T> & {
    shouldEnableAutoScrollToTopThreshold?: boolean;
};

const AUTOSCROLL_TO_TOP_THRESHOLD = 250;

function BaseInvertedFlashList<T>(props: BaseInvertedFlashListProps<T>, ref: ForwardedRef<FlashList<T>>) {
    const {shouldEnableAutoScrollToTopThreshold, ...rest} = props;

    const maintainVisibleContentPosition = useMemo(() => {
        const config: ScrollViewProps['maintainVisibleContentPosition'] = {
            // This needs to be 1 to avoid using loading views as anchors.
            minIndexForVisible: 1,
        };

        if (shouldEnableAutoScrollToTopThreshold) {
            config.autoscrollToTopThreshold = AUTOSCROLL_TO_TOP_THRESHOLD;
        }

        return config;
    }, [shouldEnableAutoScrollToTopThreshold]);

    return (
        <FlashList
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...rest}
            ref={ref}
            maintainVisibleContentPosition={maintainVisibleContentPosition}
            inverted
        />
    );
}

BaseInvertedFlashList.displayName = 'BaseInvertedFlashList';

export default forwardRef(BaseInvertedFlashList);

export {AUTOSCROLL_TO_TOP_THRESHOLD};
