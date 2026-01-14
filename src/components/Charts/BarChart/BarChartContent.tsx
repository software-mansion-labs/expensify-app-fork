import React, {useMemo} from 'react';
import {View} from 'react-native';
import {Bar, CartesianChart} from 'victory-native';
import {useFont} from '@shopify/react-native-skia';
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

function BarChartContent({data, title, titleIcon, isLoading, yAxisUnit}: BarChartProps) {
    const theme = useTheme();
    const styles = useThemeStyles();
    const font = useFont(EXPENSIFY_NEUE_FONT_URL, variables.iconSizeExtraSmall);

    // Transform data for Victory Native format
    const chartData = useMemo(() => {
        return data.map((point, index) => ({
            x: index + 1,
            y: point.total,
        }));
    }, [data]);

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
                    domainPadding={{left: 80, right: 80, top: 30}}
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
                        tickCount: 5,
                        lineWidth: 1,
                        lineColor: theme.border,
                    }]}
                    frame={{lineWidth: 0}}
                    data={chartData}
                >
                    {({points, chartBounds}) => {
                        const numBars = points.y.length;
                        const chartWidth = chartBounds.right - chartBounds.left;

                        // Calculate barWidth: n bars + (n-1) gaps = chartWidth
                        // barWidth = (chartWidth - (n-1)*gap) / n
                        const barGap = variables.sectionMargin;
                        const calculatedBarWidth = (chartWidth - (numBars - 1) * barGap) / numBars;

                        // Calculate x positions (bars flush with edges)
                        const barPositions: number[] = [];
                        for (let i = 0; i < numBars; i++) {
                            const centerX = chartBounds.left + calculatedBarWidth / 2 + i * (calculatedBarWidth + barGap);
                            barPositions.push(centerX);
                        }

                        return points.y.map((point, index) => {
                            const barColor = CHART_COLORS.at(index % CHART_COLORS.length);
                            // Override x position with our calculated position
                            const customPoint = {...point, x: barPositions.at(index) ?? point.x};
                            return (
                                <Bar
                                    barCount={numBars}
                                    // eslint-disable-next-line react/no-array-index-key
                                    key={`bar-${index}`}
                                    points={[customPoint]}
                                    chartBounds={chartBounds}
                                    barWidth={calculatedBarWidth}
                                    color={barColor}
                                    roundedCorners={{
                                        topLeft: variables.componentBorderRadius,
                                        topRight: variables.componentBorderRadius,
                                        bottomLeft: variables.componentBorderRadius,
                                        bottomRight: variables.componentBorderRadius,
                                    }}
                                />
                            );
                        });
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
