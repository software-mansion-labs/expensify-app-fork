import React, {useMemo} from 'react';
import {View} from 'react-native';
import Animated, {Keyframe, runOnJS} from 'react-native-reanimated';
import type ReanimatedModalProps from '@components/Modal/ReanimatedModal/types';
import type {ContainerProps} from '@components/Modal/ReanimatedModal/types';
import {getModalInAnimation, getModalOutAnimation} from '@components/Modal/ReanimatedModal/utils';
import useThemeStyles from '@hooks/useThemeStyles';
import CONST from '@src/CONST';
import GestureHandler from './GestureHandler';

function Container({
    style,
    animationInTiming = CONST.MODAL.REANIMATED_MODAL_ANIMATION_TIMING.DEFAULT_IN,
    animationOutTiming = CONST.MODAL.REANIMATED_MODAL_ANIMATION_TIMING.DEFAULT_OUT,
    animationInDelay = CONST.MODAL.REANIMATED_MODAL_ANIMATION_TIMING.DEFAULT_DELAY_IN,
    animationOutDelay = CONST.MODAL.REANIMATED_MODAL_ANIMATION_TIMING.DEFAULT_DELAY_OUT,
    onCloseCallBack,
    onOpenCallBack,
    animationIn,
    animationOut,
    type,
    onSwipeComplete,
    swipeDirection,
    swipeThreshold = 100,
    ...props
}: Partial<ReanimatedModalProps> & ContainerProps) {
    const styles = useThemeStyles();

    const Entering = useMemo(() => {
        const AnimationIn = new Keyframe(getModalInAnimation(animationIn));

        return AnimationIn.delay(animationInDelay)
            .duration(animationInTiming)
            .withCallback(() => {
                'worklet';

                runOnJS(onOpenCallBack)();
            });
    }, [animationIn, animationInDelay, animationInTiming, onOpenCallBack]);

    const Exiting = useMemo(() => {
        const AnimationOut = new Keyframe(getModalOutAnimation(animationOut));

        return AnimationOut.delay(animationOutDelay)
            .duration(animationOutTiming)
            .withCallback(() => {
                'worklet';

                runOnJS(onCloseCallBack)();
            });
    }, [animationOut, animationOutDelay, animationOutTiming, onCloseCallBack]);

    return (
        <View
            style={[style, styles.modalContainer]}
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...props}
        >
            <GestureHandler
                swipeThreshold={swipeThreshold}
                swipeDirection={swipeDirection}
                onSwipeComplete={onSwipeComplete}
            >
                <Animated.View
                    style={[styles.modalAnimatedContainer, type !== CONST.MODAL.MODAL_TYPE.BOTTOM_DOCKED && styles.flex1]}
                    entering={Entering}
                    exiting={Exiting}
                >
                    {props.children}
                </Animated.View>
            </GestureHandler>
        </View>
    );
}

Container.displayName = 'ModalContainer';

export default Container;
