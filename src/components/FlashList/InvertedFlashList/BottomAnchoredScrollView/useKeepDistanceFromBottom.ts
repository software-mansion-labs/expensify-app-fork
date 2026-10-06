import type Reanimated from 'react-native-reanimated';
import type {AnimatedRef} from 'react-native-reanimated';

import {useKeyboardHandler} from 'react-native-keyboard-controller';
import {measure, scrollTo, useAnimatedReaction, useScrollOffset, useSharedValue} from 'react-native-reanimated';
import {scheduleOnUI} from 'react-native-worklets';

/**
 * Keeps the distance between the viewport bottom and the content bottom when the scroll view is resized, which an inverted
 * list gets for free because its offset is measured from the bottom. The keyboard resizes the list every frame through the
 * screen's keyboard avoiding view, so the correction runs on the UI thread on every keyboard frame, and layout events catch
 * the remaining resizes such as a growing composer.
 */
function useKeepDistanceFromBottom(scrollViewRef: AnimatedRef<Reanimated.ScrollView>) {
    const scrollOffset = useScrollOffset(scrollViewRef);
    const contentHeight = useSharedValue(0);
    const viewportHeight = useSharedValue(0);
    // The offset seen at the current viewport height, so a clamp applied by the platform during a resize is not mistaken for a user scroll.
    const offsetAtViewportHeight = useSharedValue(0);

    const measureViewportHeight = () => {
        'worklet';

        // The ref is empty before the scroll view mounts and after it unmounts, while the keyboard handler is still registered.
        if (!scrollViewRef()) {
            return undefined;
        }

        return measure(scrollViewRef)?.height;
    };

    const keepDistanceFromBottom = () => {
        'worklet';

        const height = measureViewportHeight();
        if (height === undefined || height === viewportHeight.get()) {
            return;
        }

        const previousHeight = viewportHeight.get();
        viewportHeight.set(height);
        // Before the first measurement or while the content size is unknown there is nothing to keep, so the current position becomes the reference.
        if (previousHeight === 0 || contentHeight.get() === 0) {
            offsetAtViewportHeight.set(scrollOffset.get());
            return;
        }

        const maxOffset = Math.max(0, contentHeight.get() - height);
        const offset = Math.min(maxOffset, Math.max(0, offsetAtViewportHeight.get() + previousHeight - height));
        offsetAtViewportHeight.set(offset);
        scrollTo(scrollViewRef, 0, offset, false);
    };

    useAnimatedReaction(
        () => scrollOffset.get(),
        (offset) => {
            if (measureViewportHeight() !== viewportHeight.get()) {
                return;
            }
            offsetAtViewportHeight.set(offset);
        },
    );

    useKeyboardHandler(
        {
            onMove: () => {
                'worklet';

                keepDistanceFromBottom();
            },
            onEnd: () => {
                'worklet';

                keepDistanceFromBottom();
            },
        },
        [],
    );

    const onLayout = () => {
        scheduleOnUI(keepDistanceFromBottom);
    };

    const onContentSizeChange = (height: number) => {
        contentHeight.set(height);
    };

    return {onLayout, onContentSizeChange};
}

export default useKeepDistanceFromBottom;
