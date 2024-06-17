import {FlashList} from '@irisjae/flash-list';
import type {FlashListProps} from '@irisjae/flash-list';
import React, {forwardRef, useMemo} from 'react';
import type {ScrollViewProps, ViewToken} from 'react-native';
import type {ReportAction} from '@src/types/onyx';

type BaseInvertedFlashListProps = FlashListProps<ReportAction> & {
    shouldEnableAutoScrollToTopThreshold?: boolean;
};

const AUTOSCROLL_TO_TOP_THRESHOLD = 128;

let localViewableItems: ViewToken[];
const getViewableItems = () => localViewableItems;

function BaseInvertedFlashListE2e(props: BaseInvertedFlashListProps, ref: React.ForwardedRef<FlashList<ReportAction>>) {
    const {shouldEnableAutoScrollToTopThreshold, ...rest} = props;

    const handleViewableItemsChanged = useMemo(
        () =>
            ({viewableItems}: {viewableItems: ViewToken[]}) => {
                localViewableItems = viewableItems;
            },
        [],
    );

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
        <FlashList<ReportAction>
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...rest}
            ref={ref}
            maintainVisibleContentPosition={maintainVisibleContentPosition}
            inverted
            onViewableItemsChanged={handleViewableItemsChanged}
        />
    );
}

BaseInvertedFlashListE2e.displayName = 'BaseInvertedFlashListE2e';

export default forwardRef(BaseInvertedFlashListE2e);
export {getViewableItems};
