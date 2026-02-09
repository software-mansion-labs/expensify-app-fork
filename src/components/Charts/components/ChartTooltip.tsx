import React, {useLayoutEffect, useRef} from 'react';
import {View} from 'react-native';
import Animated, {useAnimatedStyle, useDerivedValue, useSharedValue} from 'react-native-reanimated';
import type {SharedValue} from 'react-native-reanimated';
import Text from '@components/Text';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

/** The height of the chart tooltip pointer */
const TOOLTIP_POINTER_HEIGHT = 4;

/** The width of the chart tooltip pointer */
const TOOLTIP_POINTER_WIDTH = 12;

type ChartTooltipProps = {
    /** Label text (e.g., "Airfare", "Amazon") */
    label: string;

    /** Formatted amount (e.g., "$1,820.00") */
    amount: string;

    /** Optional percentage to display (e.g., "12%") */
    percentage?: string;

    /** The width of the chart container */
    chartWidth: number;

    /** The initial tooltip position */
    initialTooltipPosition: SharedValue<{x: number; y: number}>;
};

function ChartTooltip({label, amount, percentage, chartWidth, initialTooltipPosition}: ChartTooltipProps) {
    const theme = useTheme();
    const styles = useThemeStyles();

    const tooltipWrapperRef = useRef<View>(null);
    const tooltipMeasuredWidth = useSharedValue(0);

    const content = percentage ? `${label} • ${amount} (${percentage})` : `${label} • ${amount}`;

    useLayoutEffect(() => {
        tooltipWrapperRef.current?.measure((_x, _y, width) => {
            if (width <= 0) {
                return;
            }
            tooltipMeasuredWidth.set(width);
        });
    }, [content, tooltipMeasuredWidth]);

    /** Calculate the center point, ensuring the box doesn't overflow the left or right edges */
    const clampedCenter = useDerivedValue(() => {
        const {x} = initialTooltipPosition.get();
        const width = tooltipMeasuredWidth.get();
        const halfWidth = width / 2;

        return Math.max(halfWidth, Math.min(chartWidth - halfWidth, x));
    }, [initialTooltipPosition, tooltipMeasuredWidth, chartWidth]);

    /** Animated style for the main tooltip container, clamped to chart boundaries */
    const tooltipStyle = useAnimatedStyle(() => {
        const {y} = initialTooltipPosition.get();

        return {
            position: 'absolute',
            left: clampedCenter.get(),
            top: y,
            transform: [{translateX: '-50%'}, {translateY: '-100%'}],
        };
    }, [initialTooltipPosition]);

    /** Animated style for the pointer, keeping it pinned to the data point even when the box is clamped */
    const pointerStyle = useAnimatedStyle(() => {
        const {x} = initialTooltipPosition.get();
        const relativeOffset = x - clampedCenter.get();

        return {
            transform: [{translateX: relativeOffset}],
        };
    }, [initialTooltipPosition]);

    return (
        <Animated.View
            style={tooltipStyle}
            pointerEvents="none"
        >
            <View
                ref={tooltipWrapperRef}
                style={styles.chartTooltipWrapper}
            >
                <View style={styles.chartTooltipBox}>
                    <Text
                        style={styles.chartTooltipText}
                        numberOfLines={1}
                    >
                        {content}
                    </Text>
                </View>
                <Animated.View
                    style={[
                        styles.chartTooltipPointer,
                        {
                            borderLeftWidth: TOOLTIP_POINTER_WIDTH / 2,
                            borderRightWidth: TOOLTIP_POINTER_WIDTH / 2,
                            borderTopWidth: TOOLTIP_POINTER_HEIGHT,
                            borderLeftColor: theme.transparent,
                            borderRightColor: theme.transparent,
                            borderTopColor: theme.heading,
                        },
                        pointerStyle,
                    ]}
                />
            </View>
        </Animated.View>
    );
}

ChartTooltip.displayName = 'ChartTooltip';

export default ChartTooltip;
