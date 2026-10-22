import shouldRenderOffscreen from '@libs/shouldRenderOffscreen';

import CONST from '@src/CONST';

import type {StyleProp, ViewStyle} from 'react-native';

import React from 'react';
import {View} from 'react-native';
import Animated, {css, cubicBezier} from 'react-native-reanimated';

const {FADE_OUT_DURATION, FADE_IN_DURATION, PAUSE_DURATION, RECOVERY_DURATION} = CONST.PULSE_ANIMATION;

const PULSE_DURATION = FADE_OUT_DURATION + FADE_IN_DURATION + PAUSE_DURATION;
const FADE_OUT_END = `${(FADE_OUT_DURATION / PULSE_DURATION) * 100}%` as const;
const FADE_IN_END = `${((FADE_OUT_DURATION + FADE_IN_DURATION) / PULSE_DURATION) * 100}%` as const;

// Quadratic ease-out / ease-in
const EASING_OUT = cubicBezier(0.5, 1, 0.89, 1);
const EASING_IN = cubicBezier(0.11, 0, 0.5, 0);

type PulsingViewProps = {
    shouldPulse: boolean;
    children: React.ReactNode;

    /**
     * Array of style objects
     * @default []
     */
    style?: StyleProp<ViewStyle>;

    /**
     * The minimum opacity reached during the pulse
     * @default 0.5
     */
    minOpacity?: number;

    /** Whether the view needs to be rendered offscreen (for Android only) */
    needsOffscreenAlphaCompositing?: boolean;

    /** Style applied to a non-animated outer wrapper, useful for opaque backgrounds that shouldn't pulse */
    wrapperStyle?: StyleProp<ViewStyle>;
};

const pulseStylesByMinOpacity = new Map<number, ReturnType<typeof createPulseStyle>>();

function createPulseStyle(minOpacity: number) {
    return css.create({
        pulsing: {
            animationName: css.keyframes({
                from: {opacity: 1, animationTimingFunction: EASING_OUT},
                [FADE_OUT_END]: {opacity: minOpacity, animationTimingFunction: EASING_IN},
                [FADE_IN_END]: {opacity: 1},
                to: {opacity: 1},
            }),
            animationDuration: `${PULSE_DURATION}ms`,
            animationIterationCount: 'infinite',
        },
    });
}

// Keyframes depend on minOpacity only, so they are created once per distinct value instead of on every render
function getPulseStyle(minOpacity: number) {
    let pulseStyle = pulseStylesByMinOpacity.get(minOpacity);
    if (!pulseStyle) {
        pulseStyle = createPulseStyle(minOpacity);
        pulseStylesByMinOpacity.set(minOpacity, pulseStyle);
    }
    return pulseStyle;
}

const staticStyles = css.create({
    // The recovery fade only runs when the pulse stops while this transition is already applied
    resting: {opacity: 1, transitionProperty: 'opacity', transitionDuration: `${RECOVERY_DURATION}ms`, transitionTimingFunction: EASING_OUT},
});

function PulsingView({shouldPulse, children, style = [], minOpacity = 0.5, needsOffscreenAlphaCompositing = false, wrapperStyle}: PulsingViewProps) {
    const pulseStyle = shouldPulse ? getPulseStyle(minOpacity).pulsing : staticStyles.resting;

    const animatedContent = (
        <Animated.View
            style={[pulseStyle, style]}
            needsOffscreenAlphaCompositing={shouldRenderOffscreen ? needsOffscreenAlphaCompositing : undefined}
        >
            {children}
        </Animated.View>
    );

    if (wrapperStyle) {
        return <View style={wrapperStyle}>{animatedContent}</View>;
    }

    return animatedContent;
}

export default PulsingView;
