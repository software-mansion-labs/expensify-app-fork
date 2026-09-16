import OpacityView from '@components/OpacityView';

import useStableReference from '@hooks/useStableReference';

import type {Color} from '@styles/theme/types';
import variables from '@styles/variables';

import {styleEqual} from '@src/utils/referenceEquality';

import type {GestureResponderEvent, LayoutChangeEvent, MouseEvent, StyleProp, ViewStyle} from 'react-native';
import type {AnimatedStyle} from 'react-native-reanimated';

import React, {useLayoutEffect, useRef, useState} from 'react';

import type PressableProps from './GenericPressable/types';

import GenericPressable from './GenericPressable';
import usePressResponderProps from './PressResponder/usePressResponderProps';
import useResponderRef from './PressResponder/useResponderRef';

type PressableWithFeedbackProps = PressableProps & {
    wrapperStyle?: StyleProp<AnimatedStyle<ViewStyle>>;

    /**
     * Determines what opacity value should be applied to the underlying view when Pressable is pressed.
     * To disable dimming, pass 1 as pressDimmingValue
     * @default variables.pressDimValue
     */
    pressDimmingValue?: number;

    /**
     * Determines what opacity value should be applied to the underlying view when pressable is hovered.
     * To disable dimming, pass 1 as hoverDimmingValue
     * @default variables.hoverDimValue
     */
    hoverDimmingValue?: number;

    /**
     * The duration of the dimming animation
     * @default variables.dimAnimationDuration
     */
    dimAnimationDuration?: number;

    /** Whether the view needs to be rendered offscreen (for Android only) */
    needsOffscreenAlphaCompositing?: boolean;

    /** The color of the underlay that will show through when the Pressable is active. */
    underlayColor?: Color;

    /**
     * Whether the button should have a background layer in the color of theme.appBG.
     * This is needed for buttons that allow content to display under them.
     */
    shouldBlendOpacity?: boolean;

    /** Optional callback fired on wrapper's mount and layout changes */
    onWrapperLayout?: ((event: LayoutChangeEvent) => void) | undefined;
};

// A fresh `[]` default per render would invalidate the memoized wrapper style on every render.
const EMPTY_WRAPPER_STYLE: StyleProp<AnimatedStyle<ViewStyle>> = [];

function PressableWithFeedback({
    children,
    wrapperStyle: wrapperStyleProp = EMPTY_WRAPPER_STYLE,
    needsOffscreenAlphaCompositing = false,
    pressDimmingValue = variables.pressDimValue,
    hoverDimmingValue = variables.hoverDimValue,
    dimAnimationDuration,
    shouldBlendOpacity,
    ref,
    onWrapperLayout,
    ...rest
}: PressableWithFeedbackProps) {
    const [isPressed, setIsPressed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const mergedRef = useResponderRef(ref);
    const slot = usePressResponderProps({
        onPress: rest.onPress,
        accessibilityState: rest.accessibilityState,
        accessibilityHasPopup: rest.accessibilityHasPopup,
        nativeID: rest.nativeID,
        accessibilityControls: rest.accessibilityControls,
    });
    // Parents tend to pass a freshly built wrapperStyle array every render; keep the previous reference while equal.
    const wrapperStyle = useStableReference(wrapperStyleProp, styleEqual);
    // Consumer handlers are read at event time so our own handlers below keep a stable identity. useRef must be
    // called right here: React Compiler only leaves `.current` out of memo dependencies for refs it sees created.
    const latestHandlers = {onHoverIn: rest.onHoverIn, onHoverOut: rest.onHoverOut, onPressIn: rest.onPressIn, onPressOut: rest.onPressOut};
    const latest = useRef(latestHandlers);
    useLayoutEffect(() => {
        latest.current = latestHandlers;
    });

    const onHoverIn = (event: MouseEvent) => {
        setIsHovered(true);
        latest.current.onHoverIn?.(event);
    };
    const onHoverOut = (event: MouseEvent) => {
        setIsHovered(false);
        latest.current.onHoverOut?.(event);
    };
    const onPressIn = (event: GestureResponderEvent) => {
        setIsPressed(true);
        latest.current.onPressIn?.(event);
    };
    const onPressOut = (event: GestureResponderEvent) => {
        setIsPressed(false);
        latest.current.onPressOut?.(event);
    };

    return (
        <OpacityView
            shouldDim={!shouldBlendOpacity && !!(!rest.disabled && (isPressed || isHovered))}
            dimmingValue={isPressed ? pressDimmingValue : hoverDimmingValue}
            dimAnimationDuration={dimAnimationDuration}
            style={wrapperStyle}
            onLayout={onWrapperLayout}
            needsOffscreenAlphaCompositing={needsOffscreenAlphaCompositing}
        >
            <GenericPressable
                {...rest}
                ref={mergedRef}
                onPress={slot.onPress}
                accessibilityState={slot.accessibilityState}
                accessibilityHasPopup={slot.accessibilityHasPopup}
                nativeID={slot.nativeID}
                accessibilityControls={slot.accessibilityControls}
                disabled={rest.disabled}
                onHoverIn={onHoverIn}
                onHoverOut={onHoverOut}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
            >
                {children}
            </GenericPressable>
        </OpacityView>
    );
}

export default PressableWithFeedback;
export type {PressableWithFeedbackProps};
