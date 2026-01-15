import React, {useEffect, useMemo, useState} from 'react';
import {View} from 'react-native';
import {useAnimatedReaction} from 'react-native-reanimated';
import {CartesianChart, getTransformComponents, setScale, setTranslate, useChartTransformState} from 'victory-native';
import {Path, Skia, useFont} from '@shopify/react-native-skia';
import ActivityIndicator from '@components/ActivityIndicator';
import {CHART_COLORS} from '@components/Charts/constants';
import type {BarChartProps} from '@components/Charts/types';
import Icon from '@components/Icon';
import Text from '@components/Text';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import variables from '@styles/variables';

/** Expensify Neue font path for web builds */
const EXPENSIFY_NEUE_FONT_URL = '/fonts/ExpensifyNeue-Regular.woff';

/** Number of Y-axis ticks */
const Y_TICK_COUNT = 5;

/** Default minimum bar width in pixels */
const DEFAULT_MIN_BAR_WIDTH = 40;

function BarChartContent({data, title, titleIcon, isLoading, yAxisUnit, minBarWidth = DEFAULT_MIN_BAR_WIDTH}: BarChartProps) {
    const theme = useTheme();
    const styles = useThemeStyles();
    const font = useFont(EXPENSIFY_NEUE_FONT_URL, variables.iconSizeExtraSmall);

    // Transform state for pan/zoom - Y-axis stays fixed, only content transforms
    const {state: transformState} = useChartTransformState();

    // Track chart bounds and content bounds for pan limits
    const [chartBoundsState, setChartBoundsState] = useState({left: 0, right: 0});
    const [contentBounds, setContentBounds] = useState({left: 0, right: 0});
    const [initialScaleApplied, setInitialScaleApplied] = useState(false);

    // Calculate required scale to ensure minBarWidth
    const requiredScale = useMemo(() => {
        const chartWidth = chartBoundsState.right - chartBoundsState.left;
        if (chartWidth === 0 || data.length === 0) {
            return 1;
        }
        // Natural bar width if all bars fit in chart
        const naturalBarWidth = chartWidth / data.length;
        // If natural width is less than minimum, we need to scale up
        if (naturalBarWidth < minBarWidth) {
            return minBarWidth / naturalBarWidth;
        }
        return 1;
    }, [chartBoundsState, data.length, minBarWidth]);

    // Apply initial scale when chart bounds AND content bounds are known
    useEffect(() => {
        // Wait until we have valid content bounds (set from render function)
        const hasValidContentBounds = contentBounds.left > 0 || contentBounds.right > 0;
        if (!initialScaleApplied && chartBoundsState.right > 0 && hasValidContentBounds && requiredScale > 1) {
            // Scale X only (to make bars wider), keep Y at 1 (bar heights unchanged)
            let newMatrix = setScale(transformState.matrix.value, requiredScale, 1);
            // Compensate translation to keep left edge of content at the left edge of viewport
            const compensateX = chartBoundsState.left - contentBounds.left * requiredScale;
            newMatrix = setTranslate(newMatrix, compensateX, 0);
            transformState.matrix.value = newMatrix;
            setInitialScaleApplied(true);
        }
    }, [chartBoundsState, contentBounds, requiredScale, initialScaleApplied, transformState.matrix]);

    // Calculate initial translation compensation (to keep content left edge at viewport left after scaling)
    const initialTranslateX = useMemo(() => {
        if (requiredScale <= 1) {
            return 0;
        }
        return chartBoundsState.left - contentBounds.left * requiredScale;
    }, [chartBoundsState.left, contentBounds.left, requiredScale]);

    // Calculate pan limits based on content vs viewport alignment (accounting for scale and initial translate)
    const panLimits = useMemo(() => {
        const viewportWidth = chartBoundsState.right - chartBoundsState.left;
        const contentWidth = contentBounds.right - contentBounds.left;
        const scaledContentWidth = contentWidth * requiredScale;
        const overflow = scaledContentWidth - viewportWidth;

        if (overflow <= 0) {
            return {minX: initialTranslateX, maxX: initialTranslateX};
        }

        return {
            minX: initialTranslateX - overflow,
            maxX: initialTranslateX,
        };
    }, [chartBoundsState, contentBounds, requiredScale, initialTranslateX]);

    // Clamp pan to bounds - prevent scrolling beyond content
    useAnimatedReaction(
        () => {
            const {translateX} = getTransformComponents(transformState.matrix.value);
            return translateX;
        },
        (translateX) => {
            const {minX, maxX} = panLimits;
            if (Math.abs(minX - maxX) < 1) {
                return;
            }

            const clampedX = Math.max(minX, Math.min(maxX, translateX));
            if (Math.abs(translateX - clampedX) > 0.5) {
                transformState.matrix.value = setTranslate(transformState.matrix.value, clampedX, 0);
            }
        },
        [panLimits],
    );

    // Transform data for Victory Native format
    const chartData = useMemo(() => {
        return data.map((point, index) => ({
            x: index + 1,
            y: point.total,
        }));
    }, [data]);

    // Callback to track chart bounds
    const handleChartBoundsChange = (bounds: {left: number; right: number; top: number; bottom: number}) => {
        setChartBoundsState({left: bounds.left, right: bounds.right});
    };

    const formatYAxisLabel = (value: number) => {
        const formatted = value >= 1000 ? `${(value / 1000).toFixed(0)}k` : `${value}`;
        return yAxisUnit ? `${yAxisUnit} ${formatted}` : formatted;
    };

    if (isLoading || !font) {
        return (
            <View style={[styles.barChartContainer, {backgroundColor: theme.highlightBG, justifyContent: 'center', alignItems: 'center'}]}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (data.length === 0) {
        return null;
    }

    return (
        <View style={[styles.barChartContainer, {backgroundColor: theme.highlightBG}]}>
            {/* Header */}
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

            {/* Chart */}
            <View style={styles.barChartChartContainer}>
                <CartesianChart
                    xKey="x"
                    padding={5}
                    yKeys={['y']}
                    domainPadding={{left: 50, right: 50, top: 30, bottom: 10}}
                    transformState={transformState}
                    transformConfig={{
                        pan: {
                            enabled: true,
                            dimensions: 'x',
                        },
                        pinch: {
                            enabled: false,
                        },
                    }}
                    onChartBoundsChange={handleChartBoundsChange}
                    xAxis={{
                        font,
                        labelColor: theme.textSupporting,
                        lineWidth: 0,
                        formatXLabel: () => '',
                    }}
                    yAxis={[{
                        font,
                        labelColor: theme.textSupporting,
                        formatYLabel: formatYAxisLabel,
                        tickCount: Y_TICK_COUNT,
                        lineWidth: 1,
                        lineColor: theme.border,
                    }]}
                    frame={{lineWidth: 0}}
                    data={chartData}
                >
                    {({points, chartBounds}) => {
                        const chartWidth = chartBounds.right - chartBounds.left;
                        const barCount = points.y.length;
                        const innerPadding = 0.3;
                        const totalBarWidth = barCount > 0 ? chartWidth / barCount : 0;
                        const barWidth = totalBarWidth * (1 - innerPadding);
                        const cornerRadius = 8;
                        // Compensate horizontal radius for X scale transform
                        const rx = requiredScale > 1 ? cornerRadius / requiredScale : cornerRadius;
                        const ry = cornerRadius;

                        // Calculate content bounds from first and last bar positions
                        if (points.y.length > 0) {
                            const firstBarX = points.y[0]?.x ?? 0;
                            const lastBarX = points.y[points.y.length - 1]?.x ?? 0;
                            const barHalfWidth = barWidth / 2;

                            const newContentBounds = {
                                left: firstBarX - barHalfWidth,
                                right: lastBarX + barHalfWidth,
                            };

                            if (Math.abs(newContentBounds.left - contentBounds.left) > 1 ||
                                Math.abs(newContentBounds.right - contentBounds.right) > 1) {
                                setTimeout(() => setContentBounds(newContentBounds), 0);
                            }
                        }

                        return (
                            <>
                                {/* Bars */}
                                {points.y.map((point, index) => {
                                    if (point.y === undefined || point.x === undefined) return null;

                                    const barColor = CHART_COLORS[index % CHART_COLORS.length];
                                    const x = point.x - barWidth / 2;
                                    const y = point.y;
                                    const w = barWidth;
                                    const h = chartBounds.bottom - point.y;
                                    // Clamp radii to avoid issues with small bars
                                    const clampedRx = Math.min(rx, w / 2);
                                    const clampedRy = Math.min(ry, h / 2);

                                    // Create path with flat edges and elliptical corners (using quadratic bezier)
                                    const path = Skia.Path.Make();
                                    // Start at top-left, after the corner
                                    path.moveTo(x + clampedRx, y);
                                    // Top edge (flat)
                                    path.lineTo(x + w - clampedRx, y);
                                    // Top-right corner (quadratic bezier)
                                    path.quadTo(x + w, y, x + w, y + clampedRy);
                                    // Right edge (flat)
                                    path.lineTo(x + w, y + h - clampedRy);
                                    // Bottom-right corner
                                    path.quadTo(x + w, y + h, x + w - clampedRx, y + h);
                                    // Bottom edge (flat)
                                    path.lineTo(x + clampedRx, y + h);
                                    // Bottom-left corner
                                    path.quadTo(x, y + h, x, y + h - clampedRy);
                                    // Left edge (flat)
                                    path.lineTo(x, y + clampedRy);
                                    // Top-left corner
                                    path.quadTo(x, y, x + clampedRx, y);
                                    path.close();

                                    return (
                                        <Path
                                            key={`bar-${index}`}
                                            path={path}
                                            color={barColor}
                                        />
                                    );
                                })}
                            </>
                        );
                    }}
                </CartesianChart>
            </View>

            {/* Legend */}
            <View style={styles.barChartLegend}>
                {data.map((point, index) => {
                    const color = CHART_COLORS.at(index % CHART_COLORS.length);
                    return (
                        <View
                            key={point.label}
                            style={styles.barChartLegendItem}
                        >
                            <View style={[styles.barChartLegendDot, {backgroundColor: color}]} />
                            <Text
                                style={[styles.barChartLegendLabel, {color: theme.textSupporting}]}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {point.label}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

BarChartContent.displayName = 'BarChartContent';

export default BarChartContent;
