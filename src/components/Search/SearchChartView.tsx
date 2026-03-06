import type {ReactNode} from 'react';
import React from 'react';
import type {NativeScrollEvent, NativeSyntheticEvent, StyleProp, ViewStyle} from 'react-native';
import {View} from 'react-native';
import Animated from 'react-native-reanimated';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import Log from '@libs/Log';
import Navigation from '@libs/Navigation/Navigation';
import {formatToParts} from '@libs/NumberFormatUtils';
import {buildSearchQueryJSON, buildSearchQueryString} from '@libs/SearchQueryUtils';
import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';
import SearchBarChart from './SearchBarChart';
import SearchLineChart from './SearchLineChart';
import SearchPieChart from './SearchPieChart';
import {SEARCH_GROUP_BY_CONFIG} from './SearchGroupByConfig';
import type {ChartView, GroupedItem, SearchChartProps, SearchGroupBy, SearchQueryJSON} from './types';

type SearchChartViewProps = {
    /** The current search query JSON */
    queryJSON: SearchQueryJSON;

    /** The view type (bar, etc.) */
    view: ChartView;

    /** The groupBy parameter */
    groupBy: SearchGroupBy;

    /** Grouped transaction data from search results */
    data: GroupedItem[];

    /** Whether data is loading */
    isLoading?: boolean;

    /** Scroll handler for hiding the top bar on mobile */
    onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;

    /** Title to be displayed on the chart */
    title: string;

    /** Element to be shown below the chart */
    footer?: ReactNode;

    /** Additional styles for the view wrapping chart component */
    containerStyle?: StyleProp<ViewStyle>;
};

/**
 * Map of chart view types to their corresponding chart components.
 */
const CHART_VIEW_TO_COMPONENT: Record<ChartView, React.ComponentType<SearchChartProps>> = {
    [CONST.SEARCH.VIEW.BAR]: SearchBarChart,
    [CONST.SEARCH.VIEW.LINE]: SearchLineChart,
    [CONST.SEARCH.VIEW.PIE]: SearchPieChart,
};

/**
 * Layer 3 component - dispatches to the appropriate chart type based on view parameter
 * and handles navigation/drill-down logic
 */
function SearchChartView({queryJSON, view, groupBy, data, isLoading, onScroll, title, footer, containerStyle}: SearchChartViewProps) {
    const styles = useThemeStyles();
    const {preferredLocale} = useLocalize();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const icons = useMemoizedLazyExpensifyIcons(['Users', 'CreditCard', 'Send', 'Folder', 'Basket', 'Tag', 'Calendar']);
    const {titleIconName, getLabel, getFilterQuery} = SEARCH_GROUP_BY_CONFIG[groupBy];
    const titleIcon = icons[titleIconName];
    const ChartComponent = CHART_VIEW_TO_COMPONENT[view];

    const handleItemPress = (filterQuery: string) => {
        const currentQueryString = buildSearchQueryString(queryJSON);
        const newQueryJSON = buildSearchQueryJSON(`${currentQueryString} ${filterQuery}`);

        if (!newQueryJSON) {
            Log.alert('[SearchChartView] Failed to build search query JSON from filter query');
            return;
        }
        newQueryJSON.groupBy = undefined;
        newQueryJSON.view = CONST.SEARCH.VIEW.TABLE;

        const newQueryString = buildSearchQueryString(newQueryJSON);
        Navigation.navigate(ROUTES.SEARCH_ROOT.getRoute({query: newQueryString}));
    };

    const firstItem = data.at(0);
    const currency = firstItem?.currency ?? 'USD';
    const parts = formatToParts(preferredLocale, 0, {style: 'currency', currency});
    const currencyPart = parts.find((p) => p.type === 'currency');
    const currencyIndex = parts.findIndex((p) => p.type === 'currency');
    const integerIndex = parts.findIndex((p) => p.type === 'integer');
    const unit = {value: currencyPart?.value ?? currency, fallback: currency};
    const unitPosition = currencyIndex < integerIndex ? 'left' : 'right';

    return (
        <Animated.ScrollView
            style={styles.flex1}
            contentContainerStyle={styles.flexGrow1}
            onScroll={onScroll}
            scrollEventThrottle={16}
        >
            <View style={[shouldUseNarrowLayout ? styles.searchListContentContainerStyles : styles.mt3, styles.mh4, styles.mb4, styles.flex1, containerStyle]}>
                <ChartComponent
                    data={data}
                    title={title}
                    titleIcon={titleIcon}
                    getLabel={getLabel}
                    getFilterQuery={getFilterQuery}
                    onItemPress={handleItemPress}
                    isLoading={isLoading}
                    unit={unit}
                    unitPosition={unitPosition}
                    footer={footer}
                />
            </View>
        </Animated.ScrollView>
    );
}

SearchChartView.displayName = 'SearchChartView';

export default SearchChartView;
