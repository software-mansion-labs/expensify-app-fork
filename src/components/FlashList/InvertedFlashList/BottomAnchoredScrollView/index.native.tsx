import type {FlashListProps} from '@shopify/flash-list';
import type {Ref} from 'react';
// eslint-disable-next-line no-restricted-imports
import type {LayoutChangeEvent, ScrollView, ScrollViewProps} from 'react-native';

import React from 'react';
import Reanimated, {useAnimatedRef} from 'react-native-reanimated';

import useKeepDistanceFromBottom from './useKeepDistanceFromBottom';

type RenderScrollComponent = FlashListProps<unknown>['renderScrollComponent'];

type BottomAnchoredScrollViewProps = ScrollViewProps & {
    ref?: Ref<ScrollView | Reanimated.ScrollView>;

    /** The scroll component requested by the list caller, rendered in place of the default one */
    ScrollComponent: RenderScrollComponent;
};

function BottomAnchoredScrollView({ref, ScrollComponent, onLayout, onContentSizeChange, ...restProps}: BottomAnchoredScrollViewProps) {
    const animatedRef = useAnimatedRef<Reanimated.ScrollView>();
    const keepDistanceFromBottom = useKeepDistanceFromBottom(animatedRef);

    const setRef = (instance: Reanimated.ScrollView | null) => {
        animatedRef(instance);
        if (typeof ref === 'function') {
            ref(instance);
        } else if (ref) {
            // eslint-disable-next-line no-param-reassign
            ref.current = instance;
        }
    };

    const handleLayout = (event: LayoutChangeEvent) => {
        keepDistanceFromBottom.onLayout();
        onLayout?.(event);
    };

    const handleContentSizeChange = (width: number, height: number) => {
        keepDistanceFromBottom.onContentSizeChange(height);
        onContentSizeChange?.(width, height);
    };

    const scrollProps = {...restProps, ref: setRef, onLayout: handleLayout, onContentSizeChange: handleContentSizeChange};

    if (ScrollComponent) {
        return <ScrollComponent {...scrollProps} />;
    }

    return <Reanimated.ScrollView {...scrollProps} />;
}

/**
 * Wraps the caller's scroll component so the newest content stays in place when the list is resized, as in an inverted list.
 * The list remounts its scroll view whenever this function changes, so the caller must keep the result stable between renders.
 */
function createBottomAnchoredScrollComponent(renderScrollComponent: RenderScrollComponent): RenderScrollComponent {
    return (props: ScrollViewProps) => (
        <BottomAnchoredScrollView
            {...props}
            ScrollComponent={renderScrollComponent}
        />
    );
}

export default createBottomAnchoredScrollComponent;
