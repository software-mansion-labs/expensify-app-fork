import React, {useMemo} from 'react';
import {View} from 'react-native';
import Animated from 'react-native-reanimated';
import type {BackdropProps} from '@components/Modal/ReanimatedModal/types';
import {getModalInAnimation, getModalOutAnimation} from '@components/Modal/ReanimatedModal/utils';
import {PressableWithoutFeedback} from '@components/Pressable';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import variables from '@styles/variables';
import CONST from '@src/CONST';

function Backdrop({
    style,
    onBackdropPress,
    animationInTiming = CONST.MODAL.ANIMATION_TIMING.DEFAULT_IN,
    animationOutTiming = CONST.MODAL.ANIMATION_TIMING.DEFAULT_OUT,
    isBackdropVisible,
    backdropOpacity = variables.overlayOpacity,
}: BackdropProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();

    const Entering = useMemo(() => (backdropOpacity ? getModalInAnimation('fadeIn').duration(animationInTiming) : undefined), [animationInTiming, backdropOpacity]);
    const Exiting = useMemo(() => (backdropOpacity ? getModalOutAnimation('fadeOut').duration(animationOutTiming) : undefined), [animationOutTiming, backdropOpacity]);

    const backdropStyle = useMemo(
        () => ({
            opacity: backdropOpacity,
        }),
        [backdropOpacity],
    );

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
                    entering={Entering}
                    exiting={Exiting}
                >
                    <View style={[style, styles.modalBackdrop, backdropStyle]} />
                </Animated.View>
            )}
        </PressableWithoutFeedback>
    );
}

Backdrop.displayName = 'Backdrop';

export default Backdrop;
