import React from 'react';
import ActivityIndicator from '@components/ActivityIndicator';
import { View } from 'react-native';
import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import colors from '@styles/theme/colors';
import type { LineChartProps } from '@components/Charts/types';

const getLineChartContent = () => import('./LineChartContent');

function LineChart(props: LineChartProps) {
    return (
        <WithSkiaWeb
            opts={{ locateFile: (file: string) => `/${file}` }}
            getComponent={getLineChartContent}
            componentProps={props}
            fallback={
                <View style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: colors.productLight200,
                    borderRadius: 16,
                    padding: 20
                }}>
                    <ActivityIndicator size="large" />
                </View>
            }
        />
    );
}

LineChart.displayName = 'LineChart';

export default LineChart;
