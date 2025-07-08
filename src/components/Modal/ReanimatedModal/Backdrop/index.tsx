import React, {useMemo} from 'react';
import Animated, {Keyframe} from 'react-native-reanimated';
import type {BackdropProps} from '@components/Modal/ReanimatedModal/types';
import {getModalInAnimation, getModalOutAnimation} from '@components/Modal/ReanimatedModal/utils';
import {PressableWithoutFeedback} from '@components/Pressable';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import CONST from '@src/CONST';

const {ANIMATION_TIMING, ANIMATION} = CONST.MODAL.REANIMATED_MODAL;

function Backdrop({
    style,
    customBackdrop,
    onBackdropPress,
    animationInDelay = ANIMATION_TIMING.DEFAULT_DELAY_IN,
    animationOutDelay = ANIMATION_TIMING.DEFAULT_DELAY_OUT,
    animationInTiming = ANIMATION_TIMING.DEFAULT_IN,
    animationOutTiming = ANIMATION_TIMING.DEFAULT_OUT,
}: BackdropProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();

    const Entering = useMemo(() => {
        const FadeIn = new Keyframe(getModalInAnimation(ANIMATION.DEFAULT_IN));
        return FadeIn.delay(animationInDelay).duration(animationInTiming);
    }, [animationInDelay, animationInTiming]);

    const Exiting = useMemo(() => {
        const FadeOut = new Keyframe(getModalOutAnimation(ANIMATION.DEFAULT_OUT));

        return FadeOut.delay(animationOutDelay).duration(animationOutTiming);
    }, [animationOutDelay, animationOutTiming]);

    const BackdropOverlay = useMemo(
        () => (
            <Animated.View
                entering={Entering}
                exiting={Exiting}
                style={[styles.modalBackdrop, style]}
            >
                {!!customBackdrop && customBackdrop}
            </Animated.View>
        ),
        [Entering, Exiting, customBackdrop, style, styles.modalBackdrop],
    );

    if (!customBackdrop) {
        return (
            <PressableWithoutFeedback
                accessible
                accessibilityLabel={translate('modal.backdropLabel')}
                onPressIn={onBackdropPress}
            >
                {BackdropOverlay}
            </PressableWithoutFeedback>
        );
    }

    return BackdropOverlay;
}

Backdrop.displayName = 'Backdrop';

export default Backdrop;
