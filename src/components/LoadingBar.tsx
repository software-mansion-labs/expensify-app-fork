import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';

import React from 'react';
import Animated, {css, cubicBezier} from 'react-native-reanimated';

type LoadingBarProps = {
    shouldShow: boolean;
};

const EASING = cubicBezier(0.65, 0, 0.35, 1);
const MIDPOINT = '50%';

const animations = css.create({
    indicator: {
        animationName: css.keyframes({
            from: {left: '0%', width: '0%', animationTimingFunction: EASING},
            [MIDPOINT]: {left: '0%', width: '100%', animationTimingFunction: EASING},
            to: {left: '100%', width: '0%'},
        }),
        animationDuration: `${CONST.ANIMATED_PROGRESS_BAR_DURATION * 2}ms`,
        animationDelay: `${CONST.ANIMATED_PROGRESS_BAR_DELAY}ms`,
        // Apply the first keyframe during the initial delay so the bar doesn't flash at full width before the animation starts
        animationFillMode: 'backwards',
        animationIterationCount: 'infinite',
    },
    // Dimming the whole bar in and out when it is shown / hidden
    containerVisible: {opacity: 1, transitionProperty: 'opacity', transitionDuration: `${CONST.ANIMATED_PROGRESS_BAR_OPACITY_DURATION}ms`},
    containerHidden: {opacity: 0, transitionProperty: 'opacity', transitionDuration: `${CONST.ANIMATED_PROGRESS_BAR_OPACITY_DURATION}ms`},
    running: {animationPlayState: 'running'},
    paused: {animationPlayState: 'paused'},
});

function LoadingBar({shouldShow}: LoadingBarProps) {
    const styles = useThemeStyles();

    return (
        <Animated.View style={[styles.progressBarWrapper, shouldShow ? animations.containerVisible : animations.containerHidden]}>
            <Animated.View style={[styles.progressBar, animations.indicator, shouldShow ? animations.running : animations.paused]} />
        </Animated.View>
    );
}

export default LoadingBar;
