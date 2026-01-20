import React, { useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { View } from 'react-native';
import { CartesianChart, Line, Scatter } from 'victory-native';
import LineChart from './LineChart';

const SAMPLE_DATA = [
    { x: 1, y: 10 },
    { x: 2, y: 25 },
    { x: 3, y: 15 },
    { x: 4, y: 32 },
    { x: 5, y: 28 },
    { x: 6, y: 45 },
    { x: 7, y: 38 },
];

function ChartContent() {
    const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

    const handleLayout = (event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        if (width > 0 && height > 0) {
            setDimensions({ width, height });
        }
    };

    return (
        <View
            style={{ height: 200, width: 300, backgroundColor: '#f5f5f5', borderRadius: 8, padding: 10 }}
            onLayout={handleLayout}
        >
            {dimensions && (
                <CartesianChart
                    data={SAMPLE_DATA}
                    xKey="x"
                    yKeys={['y']}
                >
                    {({ points }) => (
                        <Line
                            points={points.y}
                            color="#007AFF"
                            strokeWidth={2}
                        />
                    )}
                </CartesianChart>
            )}
        </View>
    );
}

export default ChartContent;
