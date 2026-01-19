import React, {useMemo, useCallback} from 'react';
import {BarChart} from '@components/Charts';
import type {BarChartDataPoint} from '@components/Charts/types';
import type IconAsset from '@src/types/utils/IconAsset';
import CONST from '@src/CONST';
import {GROUP_BY_CONFIG, getGroupedItemLabel} from './groupByConfig';
import type {GroupedTransactionItem, SearchGroupBy} from './groupByConfig';

type SearchBarChartProps = {
    /** Grouped search results - same data format as SearchList */
    data: GroupedTransactionItem[];

    /** Group-by type - determines label extraction and default title/icon */
    groupBy: SearchGroupBy;

    /** Callback when a bar is pressed - receives original item (same pattern as SearchList's onSelectRow) */
    onBarPress?: (item: GroupedTransactionItem) => void;

    /** Chart title - overrides default from groupBy config */
    title?: string;

    /** Icon displayed next to title - overrides default from groupBy config */
    titleIcon?: IconAsset;

    /** Whether data is loading */
    isLoading?: boolean;
};

/**
 * Search-aware Bar Chart wrapper.
 * Accepts the same data format as SearchList and transforms it internally for the base BarChart.
 *
 * This follows the layered architecture:
 * - SearchBarChart: Search-aware wrapper (knows about TransactionGroupListItemType)
 * - BarChart: Generic base component (knows only about { label, total, currency })
 */
function SearchBarChart({data, groupBy, onBarPress, title, titleIcon, isLoading}: SearchBarChartProps) {
    const config = GROUP_BY_CONFIG[groupBy];

    // Transform grouped items to simple chart data format
    const chartData: BarChartDataPoint[] = useMemo(() => {
        return data.map((item) => ({
            label: getGroupedItemLabel(item),
            total: (item.total ?? 0) / 100, // Convert cents to dollars
            currency: item.currency ?? CONST.CURRENCY.USD,
        }));
    }, [data]);

    // Map bar press callback to return original item
    const handleBarPress = useCallback(
        (_dataPoint: BarChartDataPoint, index: number) => {
            const originalItem = data[index];
            if (originalItem && onBarPress) {
                onBarPress(originalItem);
            }
        },
        [data, onBarPress],
    );

    return (
        <BarChart
            data={chartData}
            onBarPress={onBarPress ? handleBarPress : undefined}
            title={title ?? config.defaultTitle}
            titleIcon={titleIcon ?? config.icon}
            isLoading={isLoading}
        />
    );
}

SearchBarChart.displayName = 'SearchBarChart';

export default SearchBarChart;
