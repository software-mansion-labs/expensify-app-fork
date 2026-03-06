import Button from '@components/Button';
import {getChartTitle} from '@components/Charts/utils';
import SearchChartView from '@components/Search/SearchChartView';
import type {GroupedItem} from '@components/Search/types';
import useCardFeedsForDisplay from '@hooks/useCardFeedsForDisplay';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import {search} from '@libs/actions/Search';
import Navigation from '@libs/Navigation/Navigation';
import {buildSearchQueryJSON} from '@libs/SearchQueryUtils';
import {getSections, getSortedSections, getSuggestedSearches, isSearchDataLoaded} from '@libs/SearchUIUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type {SaveSearch} from '@src/types/onyx';
import React, {useEffect, useMemo} from 'react';
import {View} from 'react-native';
import type {OnyxEntry} from 'react-native-onyx';
import type {CustomRendererProps, TPhrasing, TText} from 'react-native-render-html';
import SearchTablePreview from '@components/Search/SearchTablePreview';
import SearchPreviewOfflineIndicator from './SearchPreviewOfflineIndicator';

function SearchPreviewRenderer({tnode}: CustomRendererProps<TText | TPhrasing>) {
    const styles = useThemeStyles();
    const {translate, localeCompare, formatPhoneNumber} = useLocalize();
    const {shouldUseNarrowLayout} = useResponsiveLayout();

    const {view, query} = tnode.attributes;
    const queryJSON = useMemo(() => buildSearchQueryJSON(query), [query]);
    const validGroupBy = queryJSON?.groupBy && Object.values(CONST.SEARCH.GROUP_BY).includes(queryJSON.groupBy) ? queryJSON.groupBy : undefined;

    const [searchResults] = useOnyx(`${ONYXKEYS.COLLECTION.SNAPSHOT}${queryJSON?.hash}`);
    const [bankAccountList] = useOnyx(ONYXKEYS.BANK_ACCOUNT_LIST);
    const [allReportMetadata] = useOnyx(ONYXKEYS.COLLECTION.REPORT_METADATA);
    const {accountID, login} = useCurrentUserPersonalDetails();
    const {isOffline} = useNetwork();
    const {defaultCardFeed} = useCardFeedsForDisplay();
    const suggestedSearches = getSuggestedSearches(accountID, defaultCardFeed?.id);
    const searchKey = Object.values(suggestedSearches).find((suggestedSearch) => suggestedSearch.similarSearchHash === queryJSON?.similarSearchHash)?.key;
    const savedSearchSelector = (searches: OnyxEntry<SaveSearch>) => (queryJSON?.hash ? searches?.[queryJSON.hash] : undefined);
    // eslint-disable-next-line rulesdir/no-inline-useOnyx-selector
    const [savedSearch] = useOnyx(ONYXKEYS.SAVED_SEARCHES, {selector: savedSearchSelector});

    const reportActionID = tnode.attributes['report-action-id'];
    const reportID = tnode.attributes['report-id'];
    const [reportActions] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${reportID}`);
    const reportAction = reportActionID ? reportActions?.[reportActionID] : undefined;

    useEffect(() => {
        if (!queryJSON) {
            return;
        }

        search({
            queryJSON,
            searchKey,
            offset: 0,
            isOffline,
            isLoading: false,
        });
    }, [queryJSON, isOffline, searchKey]);

    if (!queryJSON) {
        return null;
    }

    if (!searchResults?.data && isOffline) {
        return <SearchPreviewOfflineIndicator />;
    }

    const chartTitle = getChartTitle(savedSearch, searchKey ? suggestedSearches[searchKey] : undefined, validGroupBy, translate);

    const sortedData = searchResults?.data
        ? (getSortedSections(
              queryJSON.type,
              queryJSON.status,
              getSections({
                  type: queryJSON.type,
                  data: searchResults.data,
                  groupBy: validGroupBy,
                  queryJSON,
                  currentAccountID: accountID,
                  currentUserEmail: login ?? '',
                  translate,
                  formatPhoneNumber,
                  bankAccountList,
                  allReportMetadata,
              })[0],
              localeCompare,
              translate,
              queryJSON.sortBy,
              queryJSON.sortOrder,
              validGroupBy,
          ) as GroupedItem[])
        : [];

    const shouldShowChartView = (view === CONST.SEARCH.VIEW.BAR || view === CONST.SEARCH.VIEW.LINE || view === CONST.SEARCH.VIEW.PIE) && !!validGroupBy;

    return (
        <View style={styles.searchPreviewContainer}>
            {shouldShowChartView ? (
                <SearchChartView
                    queryJSON={queryJSON}
                    view={view}
                    groupBy={validGroupBy}
                    data={sortedData}
                    isLoading={!isSearchDataLoaded(searchResults, queryJSON)}
                    title={chartTitle}
                    footer={
                        <Button
                            small={!shouldUseNarrowLayout}
                            text={translate('common.view')}
                            style={!shouldUseNarrowLayout && [styles.alignSelfStart, styles.mbn4]}
                            onPress={() => Navigation.navigate(ROUTES.SEARCH_ROOT.getRoute({query: `${query} view:${view}`}))}
                        />
                    }
                    containerStyle={[styles.pt1, styles.mh0, styles.mt0]}
                />
            ) : (
                <SearchTablePreview
                    query={query}
                    queryJSON={queryJSON}
                    groupBy={validGroupBy}
                    chartTitle={chartTitle}
                    data={sortedData}
                    type={queryJSON.type}
                    searchResults={searchResults}
                />
            )}
        </View>
    );
}

export default SearchPreviewRenderer;
