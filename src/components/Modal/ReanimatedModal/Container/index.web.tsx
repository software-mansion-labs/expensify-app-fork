import type ReanimatedModalProps from '@components/Modal/ReanimatedModal/types';
import type {ContainerProps} from '@components/Modal/ReanimatedModal/types';
import {easing, getModalInAnimationStyle, getModalOutAnimation} from '@components/Modal/ReanimatedModal/utils';

import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';

import React, {useEffect, useMemo, useRef} from 'react';
import Animated, {Keyframe, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

function Container({
    style,
    animationIn,
    animationOut,
    animationInTiming = CONST.MODAL.ANIMATION_TIMING.DEFAULT_IN,
    animationOutTiming = CONST.MODAL.ANIMATION_TIMING.DEFAULT_OUT,
    onOpenCallBack,
    onCloseCallBack,
    type,
    ...props
}: ReanimatedModalProps & ContainerProps) {
    const styles = useThemeStyles();
    const onCloseCallbackRef = useRef(onCloseCallBack);
    const onOpenCallbackRef = useRef(onOpenCallBack);
    const animationInTimingRef = useRef(animationInTiming);
    const initProgress = useSharedValue(0);

    useEffect(() => {
        onCloseCallbackRef.current = onCloseCallBack;
    }, [onCloseCallBack]);

    useEffect(() => {
        onOpenCallbackRef.current = onOpenCallBack;
        animationInTimingRef.current = animationInTiming;
    }, [onOpenCallBack, animationInTiming]);

    // Read the latest callback and timing on setup without restarting the entry when a responsive breakpoint changes its timing.
    // A shared value guarding the start would outlive a remount that cancelled the animation, leaving the modal at progress 0 forever.
    useEffect(() => {
        initProgress.set(
            withTiming(
                1,
                {
                    duration: animationInTimingRef.current,
                    easing,
                    // on web the callbacks are not called when animations are disabled with the reduced motion setting on
                    // we enable the animations to make sure they are called
                    reduceMotion: ReduceMotion.Never,
                },
                // The remount cleanup cancels the running animation with finished=false, and only the animation that completes opens the modal.
                (finished) => {
                    if (!finished) {
                        return;
                    }
                    onOpenCallbackRef.current();
                },
            ),
        );
    }, [initProgress]);

    // instead of an entering transition since keyframe animations break keyboard on mWeb Chrome (#62799)
    const animatedStyles = useAnimatedStyle(() => getModalInAnimationStyle(animationIn)(initProgress.get()), [initProgress]);

    const Exiting = useMemo(
        () =>
            new Keyframe(getModalOutAnimation(animationOut))
                .duration(animationOutTiming)
                .withCallback(() => onCloseCallbackRef.current())
                // on web the callbacks are not called when animations are disabled with the reduced motion setting on
                // we enable the animations to make sure they are called
                .reduceMotion(ReduceMotion.Never),
        [animationOutTiming, animationOut],
    );

    return (
        <Animated.View
            style={[style, type !== CONST.MODAL.MODAL_TYPE.RIGHT_DOCKED && type !== CONST.MODAL.MODAL_TYPE.POPOVER && styles.modalAnimatedContainer, animatedStyles, {zIndex: 1}]}
            exiting={Exiting}
            {...props}
        >
            {props.children}
        </Animated.View>
    );
}

export default Container;
