import React, {useMemo} from 'react';
import {View} from 'react-native';
import Animated, {Keyframe} from 'react-native-reanimated';
import type {BackdropProps} from '@components/Modal/ReanimatedModal/types';
import {getModalInAnimation, getModalOutAnimation} from '@components/Modal/ReanimatedModal/utils';
import {PressableWithoutFeedback} from '@components/Pressable';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import variables from '@styles/variables';
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
    isBackdropVisible,
    backdropOpacity = variables.overlayOpacity,
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

    const backdropStyle = useMemo(
        () => ({
            opacity: backdropOpacity,
        }),
        [backdropOpacity],
    );

    if (!customBackdrop) {
        return (
            <PressableWithoutFeedback
                accessible
                accessibilityLabel={translate('modal.backdropLabel')}
                onPress={onBackdropPress}
                style={[styles.userSelectNone, styles.cursorAuto]}
                dataSet={{[CONST.SELECTION_SCRAPER_HIDDEN_ELEMENT]: true}}
            >
                {isBackdropVisible && (
                    <Animated.View
                        style={[styles.modalBackdrop, backdropStyle, style]}
                        entering={Entering}
                        exiting={Exiting}
                    />
                )}
            </PressableWithoutFeedback>
        );
    }
    return (
        isBackdropVisible && (
            <Animated.View
                entering={Entering}
                exiting={Exiting}
                style={[styles.userSelectNone]}
                dataSet={{[CONST.SELECTION_SCRAPER_HIDDEN_ELEMENT]: true}}
            >
                <View style={[styles.modalBackdrop, backdropStyle, style]}>{!!customBackdrop && customBackdrop}</View>
            </Animated.View>
        )
    );
}

Backdrop.displayName = 'Backdrop';

export default Backdrop;
