import React, {useEffect, useMemo, useRef} from 'react';
import Animated, {Easing, Keyframe, useAnimatedStyle, useSharedValue, withDelay, withTiming} from 'react-native-reanimated';
import type ReanimatedModalProps from '@components/Modal/ReanimatedModal/types';
import type {ContainerProps} from '@components/Modal/ReanimatedModal/types';
import useThemeStyles from '@hooks/useThemeStyles';
import CONST from '@src/CONST';

const easing = Easing.bezier(0.76, 0.0, 0.24, 1.0).factory();

function Container({
    style,
    animationInTiming = CONST.MODAL.REANIMATED_MODAL_ANIMATION_TIMING.DEFAULT_IN,
    animationOutTiming = CONST.MODAL.REANIMATED_MODAL_ANIMATION_TIMING.DEFAULT_OUT,
    animationInDelay = CONST.MODAL.REANIMATED_MODAL_ANIMATION_TIMING.DEFAULT_IN,
    animationOutDelay = CONST.MODAL.REANIMATED_MODAL_ANIMATION_TIMING.DEFAULT_DELAY_OUT,
    onOpenCallBack,
    onCloseCallBack,
    ...props
}: ReanimatedModalProps & ContainerProps) {
    const styles = useThemeStyles();
    const onCloseCallbackRef = useRef(onCloseCallBack);
    const opacity = useSharedValue(0);
    const isInitiated = useSharedValue(false);

    useEffect(() => {
        onCloseCallbackRef.current = onCloseCallBack;
    }, [onCloseCallBack]);

    useEffect(() => {
        if (isInitiated.get()) {
            return;
        }
        isInitiated.set(true);
        opacity.set(withDelay(animationInDelay, withTiming(1, {duration: animationInTiming, easing}, onOpenCallBack)));
    }, [animationInTiming, onOpenCallBack, opacity, isInitiated, animationInDelay]);

    const animatedStyles = useAnimatedStyle(() => ({opacity: opacity.get()}), [opacity]);

    const Exiting = useMemo(() => {
        const FadeOut = new Keyframe({
            from: {opacity: 1},
            to: {
                opacity: 0,
                easing,
            },
        });

        return (
            FadeOut.delay(animationOutDelay)
                .duration(animationOutTiming)
                // eslint-disable-next-line react-compiler/react-compiler
                .withCallback(() => onCloseCallbackRef.current())
        );
    }, [animationOutDelay, animationOutTiming]);

    return (
        <Animated.View
            style={[style, styles.modalContainer, styles.modalAnimatedContainer, animatedStyles]}
            exiting={Exiting}
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...props}
        >
            {props.children}
        </Animated.View>
    );
}

Container.displayName = 'ModalContainer';

export default Container;
