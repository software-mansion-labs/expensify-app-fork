import { useFont } from '@shopify/react-native-skia';
import React, { useCallback, useMemo, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { View } from 'react-native';
import { CartesianChart, Line, Scatter } from 'victory-native';
import Icon from '@components/Icon';
import * as Expensicons from '@components/Icon/Expensicons';
import Text from '@components/Text';
import useLocalize from '@hooks/useLocalize';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import variables from '@styles/variables';
import type { LineChartProps } from '@components/Charts/types';
import type { HitTestArgs } from '@components/Charts/hooks';
import { useChartInteractions, useChartLabelFormats, useChartLabelLayout } from '@components/Charts/hooks';
import { CHART_PADDING, DEFAULT_SINGLE_BAR_COLOR_INDEX, CHART_COLORS, EXPENSIFY_NEUE_FONT_URL, Y_AXIS_DOMAIN, Y_AXIS_LABEL_OFFSET, Y_AXIS_TICK_COUNT, DOT_INNER_RADIUS, DOT_OUTER_RADIUS, LINE_CHART_FRAME } from '@components/Charts/constants';
import Animated, { } from 'react-native-reanimated';
import ChartTooltip from '@components/Charts/ChartTooltip';
import ActivityIndicator from '@components/ActivityIndicator';


function LineChart({ data, title, titleIcon, isLoading, onPointPress, yAxisUnit }: LineChartProps) {
    const theme = useTheme();
    const styles = useThemeStyles();
    const font = useFont(EXPENSIFY_NEUE_FONT_URL, variables.iconSizeExtraSmall);
    const [chartWidth, setChartWidth] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);
    const { translate } = useLocalize();

    const defaultDotColor = CHART_COLORS.at(DEFAULT_SINGLE_BAR_COLOR_INDEX);

    // prepare data for display
    const chartData = data.map((point, index) => ({
        x: index,
        y: point.total,
    }));

    const handlePointPress = (index: number) => {
        if (index < 0 || index >= data.length) {
            return;
        }
        const dataPoint = data.at(index);
        if (dataPoint && onPointPress) {
            onPointPress(dataPoint, index);
        }
    };

    const handleLayout = (event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setChartWidth(width);
        setContainerHeight(height);
    };

    const { labelRotation, labelSkipInterval, truncatedLabels, maxLabelLength } = useChartLabelLayout({
        data,
        font,
        chartWidth,
        containerHeight,
    });

    const domainPadding = () => {
        return { top: 20, bottom: 20, left: 20, right: (labelRotation === -90 ? 0 : (maxLabelLength ?? 0) / 2) + 20 };
    };

    const { formatXAxisLabel, formatYAxisLabel } = useChartLabelFormats({
        data,
        yAxisUnit,
        labelSkipInterval,
        labelRotation,
        truncatedLabels,
    });

    const checkIsOverDot = (args: HitTestArgs) => {
        'worklet';

        const targetX = args.targetX;
        const targetY = args.targetY;
        return (args.cursorX - targetX) ** 2 + (args.cursorY - targetY) ** 2 <= DOT_INNER_RADIUS ** 2;
    };

    const {
        actionsRef,
        customGestures,
        activeDataIndex,
        isTooltipActive,
        tooltipStyle,
    } = useChartInteractions({
        handlePress: handlePointPress,
        checkIsOver: checkIsOverDot,
    });

    const tooltipData = () => {
        if (activeDataIndex < 0 || activeDataIndex >= data.length) {
            return null;
        }
        const dataPoint = data.at(activeDataIndex);
        if (!dataPoint) {
            return null;
        }
        return {
            label: dataPoint.label,
            amount: yAxisUnit ? `${yAxisUnit} ${dataPoint.total.toLocaleString()}` : dataPoint.total.toLocaleString(),
        };
    };

    const dynamicChartStyle = () => {
        return {
            height: 250 + (maxLabelLength ?? 0) + 100
        };
    };

    if (isLoading || !font) {
        return (
            <View style={[styles.lineChartContainer, styles.highlightBG, styles.justifyContentCenter, styles.alignItemsCenter]}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (data.length === 0) {
        return null;
    }

    return (
        <View
            style={[styles.lineChartContainer, styles.highlightBG]}
        >
            <View style={[styles.lineChartHeader]}>
                <Icon
                    src={titleIcon ?? Expensicons.CalendarSolid}
                    width={variables.iconSizeNormal}
                    height={variables.iconSizeNormal}
                    fill={theme.icon}
                />
                <Text style={[styles.textLabelSupporting, styles.lineChartTitle]}>{title ?? translate('search.charts.line.spendOverTime')}</Text>
            </View>
            <View
                style={[
                    styles.lineChartChartContainer,
                    labelRotation === -90 ? dynamicChartStyle() : undefined
                ]}
                onLayout={handleLayout}
            >
                {chartWidth > 0 && (
                    <CartesianChart
                        xKey="x"
                        padding={CHART_PADDING}
                        data={chartData}
                        yKeys={['y']}
                        domainPadding={domainPadding()}
                        xAxis={{
                            font,
                            tickCount: data.length,
                            labelColor: theme.textSupporting,
                            lineWidth: 0,
                            formatXLabel: formatXAxisLabel,
                            labelRotate: labelRotation,
                        }}
                        yAxis={[
                            {
                                font,
                                labelColor: theme.textSupporting,
                                formatYLabel: formatYAxisLabel,
                                tickCount: Y_AXIS_TICK_COUNT,
                                lineWidth: 0,
                                lineColor: theme.border,
                                labelOffset: Y_AXIS_LABEL_OFFSET,
                                domain: Y_AXIS_DOMAIN,
                            },
                        ]}
                        frame={LINE_CHART_FRAME}
                        actionsRef={actionsRef}
                        customGestures={customGestures}
                    >
                        {({ points }) => (
                            <>
                                <Line
                                    points={points.y}
                                    color={theme.buttonPressedBG}
                                    strokeWidth={2}
                                />
                                {points.y.map((point) => {
                                    return (
                                        <>
                                            <Scatter
                                                points={[point]}
                                                color={theme.textBackground}
                                                radius={DOT_OUTER_RADIUS}
                                            />
                                            <Scatter
                                                points={[point]}
                                                color={defaultDotColor}
                                                radius={DOT_INNER_RADIUS}
                                            />
                                        </>
                                    );
                                })}
                            </>
                        )}
                    </CartesianChart>
                )}
                {isTooltipActive && !!tooltipData && (
                    <Animated.View style={tooltipStyle}>
                        <ChartTooltip
                            label={tooltipData()?.label ?? ''}
                            amount={tooltipData()?.amount ?? ''}
                        />
                    </Animated.View>
                )}
            </View>
        </View >
    );
}

export default LineChart;
