import React, {useCallback, useMemo, useRef, useState} from 'react';
import type {LayoutChangeEvent} from 'react-native';
import {View} from 'react-native';
import {Gesture} from 'react-native-gesture-handler';
import Animated, {useAnimatedReaction, useAnimatedStyle, useDerivedValue, useSharedValue} from 'react-native-reanimated';
import {scheduleOnRN} from 'react-native-worklets';
import type {ChartBounds, PointsArray} from 'victory-native';
import {Bar, CartesianChart} from 'victory-native';
import {useFont} from '@shopify/react-native-skia';
import {useChartInteractionState} from '@components/Charts/hooks';
import ChartTooltip from '@components/Charts/ChartTooltip';
import ActivityIndicator from '@components/ActivityIndicator';
import {
    BAR_INNER_PADDING,
    BAR_ROUNDED_CORNERS,
    CHART_COLORS,
    CHART_PADDING,
    DEFAULT_SINGLE_BAR_COLOR_INDEX,
    DOMAIN_PADDING,
    DOMAIN_PADDING_SAFETY_BUFFER,
    EXPENSIFY_NEUE_FONT_URL,
    FRAME_LINE_WIDTH,
    LABEL_ELLIPSIS,
    LABEL_PADDING,
    SIN_45_DEGREES,
    TOOLTIP_BAR_GAP,
    X_AXIS_LABEL_MAX_HEIGHT_RATIO,
    X_AXIS_LABEL_ROTATION_45,
    X_AXIS_LABEL_ROTATION_90,
    X_AXIS_LINE_WIDTH,
    Y_AXIS_DOMAIN,
    Y_AXIS_LABEL_OFFSET,
    Y_AXIS_LINE_WIDTH,
    Y_AXIS_TICK_COUNT,
} from '@components/Charts/constants';
import type {BarChartProps} from '@components/Charts/types';
import Icon from '@components/Icon';
import Text from '@components/Text';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import variables from '@styles/variables';

/**
 * Calculate minimum domainPadding required to prevent bars from overflowing chart edges.
 *
 * The issue: victory-native calculates bar width as (1 - innerPadding) * chartWidth / barCount,
 * but positions bars at indices [0, 1, ..., n-1] scaled to the chart width with domainPadding.
 * For small bar counts, the default padding is insufficient and bars overflow.
 */
function calculateMinDomainPadding(chartWidth: number, barCount: number, innerPadding: number): number {
    if (barCount <= 0) {
        return 0;
    }
    const minPaddingRatio = (1 - innerPadding) / (2 * (barCount - 1 + innerPadding));
    return Math.ceil(chartWidth * minPaddingRatio * DOMAIN_PADDING_SAFETY_BUFFER);
}

/**
 * Measure the width of a text string using the font's glyph widths.
 * Uses getGlyphWidths as measureText is not implemented on React Native Web.
 */
function measureTextWidth(text: string, fontInstance: ReturnType<typeof useFont>): number {
    if (!fontInstance) {
        return 0;
    }
    const glyphIDs = fontInstance.getGlyphIDs(text);
    const glyphWidths = fontInstance.getGlyphWidths(glyphIDs);
    return glyphWidths.reduce((sum, w) => sum + w, 0);
}

/** Type for Victory's actionsRef handle - uses unknown since Victory accepts ChartPressState-compatible objects */
type CartesianActionsHandle = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handleTouch: (state: any, x: number, y: number) => void;
};

function BarChartContent({data, title, titleIcon, isLoading, yAxisUnit, useSingleColor = false, onBarPress}: BarChartProps) {
    const theme = useTheme();
    const styles = useThemeStyles();
    const font = useFont(EXPENSIFY_NEUE_FONT_URL, variables.iconSizeExtraSmall);
    const [chartWidth, setChartWidth] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);
    const {state: chartInteractionState, isActive: isTooltipActive} = useChartInteractionState({x: 0, y: {y: 0}});
    const actionsRef = useRef<CartesianActionsHandle>(null);

    const defaultBarColor = CHART_COLORS.at(DEFAULT_SINGLE_BAR_COLOR_INDEX);

    const handleLayout = useCallback((event: LayoutChangeEvent) => {
        const {width, height} = event.nativeEvent.layout;
        setChartWidth(width);
        setContainerHeight(height);
    }, []);

    const chartData = useMemo(() => {
        return data.map((point, index) => ({
            x: index,
            y: point.total,
        }));
    }, [data]);

    const domainPadding = useMemo(() => {
        if (chartWidth === 0) {
            return {left: 0, right: 0, top: DOMAIN_PADDING.top, bottom: DOMAIN_PADDING.bottom};
        }
        const horizontalPadding = calculateMinDomainPadding(chartWidth, data.length, BAR_INNER_PADDING);
        return {left: horizontalPadding, right: horizontalPadding + DOMAIN_PADDING.right, top: DOMAIN_PADDING.top, bottom: DOMAIN_PADDING.bottom};
    }, [chartWidth, data.length]);

    // Calculate rotation and truncation for X-axis labels
    // Monotonic progression: 0° → 45° → 90° based on WIDTH constraint
    // Truncation: use max width limit so Victory allocates appropriate space
    const {labelRotation, labelSkipInterval, truncatedLabels} = useMemo(() => {
        if (!font || chartWidth === 0 || containerHeight === 0 || data.length === 0) {
            return {labelRotation: 0, labelSkipInterval: 1, truncatedLabels: data.map((p) => p.label)};
        }

        // Get font metrics
        const fontMetrics = font.getMetrics();
        const lineHeight = Math.abs(fontMetrics.descent) + Math.abs(fontMetrics.ascent);
        const ellipsisWidth = measureTextWidth(LABEL_ELLIPSIS, font);

        // Calculate available dimensions
        const availableWidthPerBar = chartWidth / data.length - LABEL_PADDING;

        // Measure original labels
        const labelWidths = data.map((p) => measureTextWidth(p.label, font));
        const maxLabelWidth = Math.max(...labelWidths);

        // Helper to truncate a label to fit a max pixel width
        const truncateToWidth = (label: string, labelWidth: number, maxWidth: number): string => {
            if (labelWidth <= maxWidth) {
                return label;
            }
            const availableWidth = maxWidth - ellipsisWidth;
            if (availableWidth <= 0) {
                return LABEL_ELLIPSIS;
            }
            const ratio = availableWidth / labelWidth;
            const maxChars = Math.max(1, Math.floor(label.length * ratio));
            return label.slice(0, maxChars) + LABEL_ELLIPSIS;
        };

        // === DETERMINE ROTATION (based on WIDTH constraint, monotonic: 0° → 45° → 90°) ===
        let rotation = 0;
        if (maxLabelWidth > availableWidthPerBar) {
            // Labels don't fit at 0°, try 45°
            const effectiveWidthAt45 = maxLabelWidth * SIN_45_DEGREES;
            if (effectiveWidthAt45 <= availableWidthPerBar) {
                rotation = 45;
            } else {
                // 45° doesn't fit either, use 90°
                rotation = 90;
            }
        }

        // === DETERMINE TRUNCATION ===
        // Limit label area to X_AXIS_LABEL_MAX_HEIGHT_RATIO of container height.
        //
        // IMPLEMENTATION NOTE: We assume Victory allocates space for X-axis labels using:
        //   totalHeight = fontHeight + yAxis.labelOffset * 2 + labelWidth * sin(angle)
        // This formula was found in: victory-native-xl/src/cartesian/utils/transformInputData.ts
        // If Victory changes this formula, these calculations will need adjustment.
        //
        // We calculate max labelWidth so total allocation stays within our limit.
        const maxLabelHeight = containerHeight * X_AXIS_LABEL_MAX_HEIGHT_RATIO;
        const victoryBaseAllocation = lineHeight + Y_AXIS_LABEL_OFFSET * 2;
        const availableForRotation = Math.max(0, maxLabelHeight - victoryBaseAllocation);

        let maxAllowedLabelWidth: number;

        if (rotation === 0) {
            // At 0°: no truncation, use skip interval instead (like Google Sheets)
            maxAllowedLabelWidth = Infinity;
        } else if (rotation === 45) {
            // At 45°: labelWidth * sin(45°) <= availableForRotation
            // labelWidth <= availableForRotation / sin(45°)
            maxAllowedLabelWidth = availableForRotation / SIN_45_DEGREES;
        } else {
            // At 90°: labelWidth <= availableForRotation
            maxAllowedLabelWidth = availableForRotation;
        }

        // Generate truncated labels
        const finalLabels = data.map((p, i) => truncateToWidth(p.label, labelWidths.at(i) ?? 0, maxAllowedLabelWidth));

        // === CALCULATE SKIP INTERVAL ===
        let skipInterval = 1;
        const finalMaxWidth = Math.max(...finalLabels.map((l) => measureTextWidth(l, font)));
        let effectiveWidth: number;
        if (rotation === 0) {
            effectiveWidth = finalMaxWidth;
        } else if (rotation === 45) {
            effectiveWidth = finalMaxWidth * SIN_45_DEGREES;
        } else {
            effectiveWidth = lineHeight; // At 90°, width is the line height
        }

        if (effectiveWidth > availableWidthPerBar) {
            skipInterval = Math.ceil(effectiveWidth / availableWidthPerBar);
        }

        // Convert rotation to negative degrees for Victory chart
        let rotationValue = 0;
        if (rotation === 45) {
            rotationValue = X_AXIS_LABEL_ROTATION_45;
        } else if (rotation === 90) {
            rotationValue = X_AXIS_LABEL_ROTATION_90;
        }

        return {labelRotation: rotationValue, labelSkipInterval: skipInterval, truncatedLabels: finalLabels};
    }, [font, chartWidth, containerHeight, data]);

    const formatYAxisLabel = useCallback(
        (value: number) => {
            const formatted = value.toLocaleString();
            return yAxisUnit ? `${yAxisUnit}${formatted}` : formatted;
        },
        [yAxisUnit],
    );

    const formatXAxisLabel = useCallback(
        (value: number) => {
            const index = Math.round(value);
            // Skip labels based on calculated interval
            if (index % labelSkipInterval !== 0) {
                return '';
            }
            // Use pre-truncated labels
            return truncatedLabels.at(index) ?? '';
        },
        [truncatedLabels, labelSkipInterval],
    );

    const [activeDataIndex, setActiveDataIndex] = useState(-1);
    const [isOverBar, setIsOverBar] = useState(false);

    // Store bar geometry for hit-testing (only constants, no arrays)
    const barGeometry = useSharedValue({barWidth: 0, chartBottom: 0});

    const handleChartBoundsChange = useCallback(
        (bounds: ChartBounds) => {
            const domainWidth = bounds.right - bounds.left;
            const calculatedBarWidth = ((1 - BAR_INNER_PADDING) * domainWidth) / data.length;
            barGeometry.set({
                barWidth: calculatedBarWidth,
                chartBottom: bounds.bottom,
            });
        },
        [data.length, barGeometry],
    );

    // Check if cursor is over the matched bar
    // Uses chartInteractionState.x.position (bar center X) and chartInteractionState.y.y.position (bar top Y)
    const isCursorOverBar = useDerivedValue(() => {
        const {barWidth, chartBottom} = barGeometry.get();
        const cursorX = chartInteractionState.cursor.x.get();
        const cursorY = chartInteractionState.cursor.y.get();

        if (barWidth === 0) {
            return false;
        }

        // Bar bounds from the matched point's position (already computed by victory-native)
        const barCenterX = chartInteractionState.x.position.get();
        const barTop = chartInteractionState.y.y.position.get();

        const barLeft = barCenterX - barWidth / 2;
        const barRight = barCenterX + barWidth / 2;

        return cursorX >= barLeft && cursorX <= barRight && cursorY >= barTop && cursorY <= chartBottom;
    });

    useAnimatedReaction(
        () => chartInteractionState.matchedIndex.get(),
        (currentIndex) => {
            scheduleOnRN(setActiveDataIndex, currentIndex);
        },
    );

    useAnimatedReaction(
        () => isCursorOverBar.get(),
        (isOver) => {
            scheduleOnRN(setIsOverBar, isOver);
        },
    );

    const tooltipData = useMemo(() => {
        if (activeDataIndex < 0 || activeDataIndex >= data.length) {
            return null;
        }
        const dataPoint = data.at(activeDataIndex);
        if (!dataPoint) {
            return null;
        }
        const formattedAmount = yAxisUnit ? `${yAxisUnit}${dataPoint.total.toLocaleString()}` : dataPoint.total.toLocaleString();
        return {
            label: dataPoint.label,
            amount: formattedAmount,
        };
    }, [activeDataIndex, data, yAxisUnit]);

    const tooltipStyle = useAnimatedStyle(() => {
        return {
            position: 'absolute',
            left: chartInteractionState.x.position.get(),
            top: chartInteractionState.y.y.position.get() - TOOLTIP_BAR_GAP,
            transform: [{translateX: '-50%'}, {translateY: '-100%'}],
            opacity: chartInteractionState.isActive.get() ? 1 : 0,
        };
    });

    // Handle bar press callback
    const handleBarPress = useCallback(
        (index: number) => {
            if (index < 0 || index >= data.length) {
                return;
            }
            const dataPoint = data.at(index);
            if (dataPoint && onBarPress) {
                onBarPress(dataPoint, index);
            }
        },
        [data, onBarPress],
    );

    // Hover gesture for web - shows tooltip on mouse hover
    const hoverGesture = useMemo(
        () =>
            Gesture.Hover()
                .onBegin((e) => {
                    'worklet';

                    chartInteractionState.isActive.value = true;
                    chartInteractionState.cursor.x.value = e.x;
                    chartInteractionState.cursor.y.value = e.y;
                    actionsRef.current?.handleTouch(chartInteractionState, e.x, e.y);
                })
                .onUpdate((e) => {
                    'worklet';

                    chartInteractionState.cursor.x.value = e.x;
                    chartInteractionState.cursor.y.value = e.y;
                    actionsRef.current?.handleTouch(chartInteractionState, e.x, e.y);
                })
                .onEnd(() => {
                    'worklet';

                    chartInteractionState.isActive.value = false;
                }),
        [chartInteractionState],
    );

    // Tap gesture for click/tap - triggers navigation
    const tapGesture = useMemo(
        () =>
            Gesture.Tap().onEnd((e) => {
                'worklet';

                // Use handleTouch to find which bar was tapped
                actionsRef.current?.handleTouch(chartInteractionState, e.x, e.y);
                const matchedIndex = chartInteractionState.matchedIndex.value;

                // Check if tap is over the bar (not just nearest)
                const {barWidth, chartBottom} = barGeometry.value;
                const barCenterX = chartInteractionState.x.position.value;
                const barTop = chartInteractionState.y.y.position.value;
                const barLeft = barCenterX - barWidth / 2;
                const barRight = barCenterX + barWidth / 2;

                const isTapOverBar = e.x >= barLeft && e.x <= barRight && e.y >= barTop && e.y <= chartBottom;

                if (isTapOverBar && matchedIndex >= 0) {
                    scheduleOnRN(handleBarPress, matchedIndex);
                }
            }),
        // eslint-disable-next-line react-compiler/react-compiler, react-hooks/exhaustive-deps, rulesdir/prefer-narrow-hook-dependencies -- shared values are stable references
        [chartInteractionState, barGeometry, handleBarPress],
    );

    // Combined gestures for the chart - Race allows both hover and tap to work independently
    const customGestures = useMemo(() => Gesture.Race(hoverGesture, tapGesture), [hoverGesture, tapGesture]);

    const renderBar = useCallback(
        (point: PointsArray[number], chartBounds: ChartBounds, barCount: number) => {
            const dataIndex = point.xValue as number;
            const dataPoint = data.at(dataIndex);
            const barColor = useSingleColor ? defaultBarColor : CHART_COLORS.at(dataIndex % CHART_COLORS.length);

            return (
                <Bar
                    key={`bar-${dataPoint?.label}`}
                    points={[point]}
                    chartBounds={chartBounds}
                    color={barColor}
                    barCount={barCount}
                    innerPadding={BAR_INNER_PADDING}
                    roundedCorners={BAR_ROUNDED_CORNERS}
                />
            );
        },
        [data, useSingleColor, defaultBarColor],
    );

    if (isLoading || !font) {
        return (
            <View style={[styles.barChartContainer, styles.highlightBG, styles.justifyContentCenter, styles.alignItemsCenter]}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (data.length === 0) {
        return null;
    }

    return (
        <View style={[styles.barChartContainer, styles.highlightBG]}>
            {!!title && (
                <View style={styles.barChartHeader}>
                    {!!titleIcon && (
                        <Icon
                            src={titleIcon}
                            width={variables.iconSizeNormal}
                            height={variables.iconSizeNormal}
                        />
                    )}
                    <Text style={[styles.textLabelSupporting, styles.barChartTitle]}>{title}</Text>
                </View>
            )}

            <View
                style={styles.barChartChartContainer}
                onLayout={handleLayout}
            >
                {chartWidth > 0 && (
                    <CartesianChart
                        xKey="x"
                        padding={CHART_PADDING}
                        yKeys={['y']}
                        domainPadding={domainPadding}
                        actionsRef={actionsRef}
                        customGestures={customGestures}
                        onChartBoundsChange={handleChartBoundsChange}
                        xAxis={{
                            font,
                            tickCount: data.length,
                            labelColor: theme.textSupporting,
                            lineWidth: X_AXIS_LINE_WIDTH,
                            formatXLabel: formatXAxisLabel,
                            labelRotate: labelRotation,
                        }}
                        yAxis={[
                            {
                                font,
                                labelColor: theme.textSupporting,
                                formatYLabel: formatYAxisLabel,
                                tickCount: Y_AXIS_TICK_COUNT,
                                lineWidth: Y_AXIS_LINE_WIDTH,
                                lineColor: theme.border,
                                labelOffset: Y_AXIS_LABEL_OFFSET,
                                domain: Y_AXIS_DOMAIN,
                                lineExtent: 'content',
                                contentInnerPadding: BAR_INNER_PADDING,
                                dataPointCount: data.length,
                            },
                        ]}
                        frame={{lineWidth: FRAME_LINE_WIDTH}}
                        data={chartData}
                    >
                        {({points, chartBounds}) => (
                            <>{points.y.map((point) => renderBar(point, chartBounds, points.y.length))}</>
                        )}
                    </CartesianChart>
                )}
                {isTooltipActive && isOverBar && !!tooltipData && (
                    <Animated.View style={tooltipStyle}>
                        <ChartTooltip
                            label={tooltipData.label}
                            amount={tooltipData.amount}
                        />
                    </Animated.View>
                )}
            </View>
        </View>
    );
}

export default BarChartContent;
