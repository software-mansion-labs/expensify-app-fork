import { useFont } from '@shopify/react-native-skia';
import React, { useCallback, useMemo, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { View } from 'react-native';
import { CartesianChart, Line, Scatter, useChartPressState } from 'victory-native';
import Icon from '@components/Icon';
import * as Expensicons from '@components/Icon/Expensicons';
import Text from '@components/Text';
import useLocalize from '@hooks/useLocalize';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import colors from '@styles/theme/colors';
import variables from '@styles/variables';
import type { LineChartProps } from '@components/Charts/types';
import { useChartLabelLayout } from '@components/Charts/hooks';
import { CHART_PADDING, Y_AXIS_DOMAIN, Y_AXIS_LABEL_OFFSET, Y_AXIS_TICK_COUNT } from '@components/Charts/constants';

const data1 = [
    // Generated points
    ...Array.from({ length: 24 }, (_, i) => {
        const x = i;
        const y = 30 + 22 * Math.sin(x / 5) + Math.random() * 10; // Simulated variation
        return { x, y: Math.round(y * 34) };
    }),
];


const ticks = [0, 500, 1000, 1500, 2000]


function LineChart({ data, title, titleIcon, isLoading, onPointPress, yAxisUnit }: LineChartProps) {

    const [chartWidth, setChartWidth] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);
    const { translate } = useLocalize();

    const { state, isActive } = useChartPressState({ x: 0, y: { y: 0 } });

    const handleLayout = (event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setChartWidth(width);
        setContainerHeight(height);
    };
    /** Expensify Neue font path for web builds */
    const EXPENSIFY_NEUE_FONT_URL = '/fonts/ExpensifyNeue-Regular.woff';

    const styles = useThemeStyles();
    const theme = useTheme();
    const font = useFont(EXPENSIFY_NEUE_FONT_URL, 13);
    const CHART_COLORS = [colors.yellow400, colors.tangerine400, colors.pink400, colors.green400, colors.ice400];
    const formatYaxisLabel = (value: number) => {
        return yAxisUnit ? `${yAxisUnit} ${value}` : value.toString();
    };

    const chartData = useMemo(() => {
        return data.map((point, index) => ({
            x: index,
            y: point.total,
        }));
    }, [data]);

    const { labelRotation, labelSkipInterval, truncatedLabels } = useChartLabelLayout({
        data,
        font,
        chartWidth,
        containerHeight,
    });

    const formatYAxisLabel = useCallback((value: number) => {
        const formatted = value.toLocaleString();
        return yAxisUnit ? `${yAxisUnit} ${formatted}` : formatted;
    }, [yAxisUnit]);

    const formatXAxisLabel = useCallback((value: number) => {
        console.log('value', value, 'labelSkipInterval', labelSkipInterval, 'truncatedLabels', truncatedLabels);
        const index = Math.round(value);
        if (index % labelSkipInterval !== 0) {
            return '';
        }
        console.log('truncatedLabels.at(index)', truncatedLabels.at(index));
        return truncatedLabels.at(index) ?? '';
    }, [truncatedLabels, labelSkipInterval]);


    console.log('chartData', chartData);
    // todo add ticks values computation based on the data

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
                <Text style={[styles.labelStrong, { fontSize: variables.fontSizeNormal, alignSelf: 'center' }]}>{translate('search.charts.line.spendOverTime')}</Text>
            </View>
            <View
                style={[styles.lineChartChartContainer]}
                onLayout={handleLayout}
            >
                {chartWidth > 0 && (
                    <CartesianChart
                        xKey="x"
                        padding={CHART_PADDING}
                        data={chartData}
                        yKeys={['y']}
                        domainPadding={20}
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
                                // tickCount: Y_AXIS_TICK_COUNT,
                                tickValues: ticks,
                                lineWidth: 0,
                                lineColor: theme.border,
                                labelOffset: Y_AXIS_LABEL_OFFSET,
                                domain: Y_AXIS_DOMAIN,
                            },
                        ]}
                        frame={{ lineWidth: 1 }}
                    >
                        {({ points }) => (
                            <>
                                <Line
                                    points={points.y}
                                    color={theme.buttonPressedBG}
                                    strokeWidth={2}
                                />
                                {points.y.map((point) => {
                                    const color = CHART_COLORS.at(4);
                                    return (
                                        <>
                                            <Scatter
                                                points={[point]}
                                                color={theme.textBackground}
                                                radius={8}
                                            />
                                            <Scatter
                                                points={[point]}
                                                color={color}
                                                radius={6}
                                            />
                                        </>
                                    );
                                })}
                            </>
                        )}
                    </CartesianChart>
                )}
            </View>
        </View>
    );
}

export default LineChart;
