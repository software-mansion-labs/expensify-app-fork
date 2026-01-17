import React, {useCallback, useMemo, useState} from 'react';
import type {LayoutChangeEvent} from 'react-native';
import {View} from 'react-native';
import type {ChartBounds, PointsArray} from 'victory-native';
import {Bar, CartesianChart} from 'victory-native';
import {useFont} from '@shopify/react-native-skia';
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

function BarChartContent({data, title, titleIcon, isLoading, yAxisUnit, useSingleColor = false}: BarChartProps) {
    const theme = useTheme();
    const styles = useThemeStyles();
    const font = useFont(EXPENSIFY_NEUE_FONT_URL, variables.iconSizeExtraSmall);
    const [chartWidth, setChartWidth] = useState(0);

    const defaultBarColor = CHART_COLORS.at(DEFAULT_SINGLE_BAR_COLOR_INDEX);

    const handleLayout = useCallback((event: LayoutChangeEvent) => {
        const {width} = event.nativeEvent.layout;
        setChartWidth(width);
    }, []);

    const chartData = useMemo(() => {
        return data.map((point, index) => ({
            x: index,
            y: point.total,
        }));
    }, [data]);

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
            return data.at(index)?.label ?? '';
        },
        [data],
    );

    const domainPadding = useMemo(() => {
        if (chartWidth === 0) {
            return {left: 0, right: 0, top: DOMAIN_PADDING.top, bottom: DOMAIN_PADDING.bottom};
        }
        const horizontalPadding = calculateMinDomainPadding(chartWidth, data.length, BAR_INNER_PADDING);
        return {left: horizontalPadding, right: horizontalPadding, top: DOMAIN_PADDING.top, bottom: DOMAIN_PADDING.bottom};
    }, [chartWidth, data.length]);

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
                        xAxis={{
                            font,
                            tickCount: data.length,
                            labelColor: theme.textSupporting,
                            lineWidth: X_AXIS_LINE_WIDTH,
                            formatXLabel: formatXAxisLabel,
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
                        {({points, chartBounds}) => <>{points.y.map((point) => renderBar(point, chartBounds, points.y.length))}</>}
                    </CartesianChart>
                )}
            </View>
        </View>
    );
}

export default BarChartContent;
