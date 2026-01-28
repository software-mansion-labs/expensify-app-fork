type ChartDataPoint = {
    label: string;
};

type UseChartLabelFormatsProps = {
    data: ChartDataPoint[];
    yAxisUnit?: string;
    yAxisUnitPosition?: 'left' | 'right';
    labelSkipInterval: number;
    labelRotation: number;
    truncatedLabels: string[];
};

/**
 * Hook for styling chart labels.
 */
export default function useChartLabelFormats({data, yAxisUnit, yAxisUnitPosition = 'left', labelSkipInterval, labelRotation, truncatedLabels}: UseChartLabelFormatsProps) {
    const formatYAxisLabel = (value: number) => {
        const formatted = value.toLocaleString();
        if (!yAxisUnit) {
            return formatted;
        }

        const separator = yAxisUnit.length > 1 ? ' ' : '';
        return yAxisUnitPosition === 'left' ? `${yAxisUnit}${separator}${formatted}` : `${formatted}${separator}${yAxisUnit}`;
    };

    const formatXAxisLabel = (value: number) => {
        const index = Math.round(value);

        if (index % labelSkipInterval !== 0) {
            return '';
        }

        const sourceToUse = labelRotation === -90 ? data.map((p) => p.label) : truncatedLabels;

        return sourceToUse.at(index) ?? '';
    };

    return {
        formatXAxisLabel,
        formatYAxisLabel,
    };
}
