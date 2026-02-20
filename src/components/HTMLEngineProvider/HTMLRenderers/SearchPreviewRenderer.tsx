import AttachmentOfflineIndicator from '@components/AttachmentOfflineIndicator';
import Button from '@components/Button';
import {getChartTitle} from '@components/Charts/utils';
import SearchChartView from '@components/Search/SearchChartView';
import {SearchScopeProvider} from '@components/Search/SearchScopeProvider';
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

function SearchPreviewRenderer({tnode}: CustomRendererProps<TText | TPhrasing>) {
    const styles = useThemeStyles();
    const {translate, localeCompare, formatPhoneNumber} = useLocalize();
    const {shouldUseNarrowLayout} = useResponsiveLayout();

    const query = tnode.attributes.query;
    const queryJSON = useMemo(() => buildSearchQueryJSON(query), [query]);
    const validGroupBy = queryJSON?.groupBy && Object.values(CONST.SEARCH.GROUP_BY).includes(queryJSON.groupBy) ? queryJSON.groupBy : undefined;
    const validView = tnode.attributes.view === CONST.SEARCH.VIEW.BAR || tnode.attributes.view === CONST.SEARCH.VIEW.LINE ? tnode.attributes.view : undefined;

    const [searchResults] = useOnyx(`${ONYXKEYS.COLLECTION.SNAPSHOT}${queryJSON?.hash}`, {canBeMissing: true});
    const [bankAccountList] = useOnyx(ONYXKEYS.BANK_ACCOUNT_LIST, {canBeMissing: true});
    const [allReportMetadata] = useOnyx(ONYXKEYS.COLLECTION.REPORT_METADATA, {canBeMissing: true});
    const {accountID, login} = useCurrentUserPersonalDetails();
    const {isOffline} = useNetwork();
    const {defaultCardFeed} = useCardFeedsForDisplay();
    const suggestedSearches = getSuggestedSearches(accountID, defaultCardFeed?.id);
    const searchKey = Object.values(suggestedSearches).find((suggestedSearch) => suggestedSearch.similarSearchHash === queryJSON?.similarSearchHash)?.key;
    const savedSearchSelector = (searches: OnyxEntry<SaveSearch>) => (queryJSON?.hash ? searches?.[queryJSON.hash] : undefined);
    // eslint-disable-next-line rulesdir/no-inline-useOnyx-selector
    const [savedSearch] = useOnyx(ONYXKEYS.SAVED_SEARCHES, {canBeMissing: true, selector: savedSearchSelector});

    useEffect(() => {
        if (!queryJSON) {
            return;
        }

        search({
            queryJSON,
            searchKey,
            offset: 0,
            isOffline,
            isLoading: !!searchResults?.isLoading,
        });
    }, [queryJSON, isOffline, searchKey, searchResults?.isLoading]);

    if (!queryJSON || !validGroupBy || !validView) {
        return null;
    }

    if (!searchResults?.data && isOffline) {
        return (
            <View style={[styles.barChartContainer, styles.minHeight42, styles.receiptPreviewAspectRatio, styles.overflowHidden]}>
                <AttachmentOfflineIndicator isPreview />
            </View>
        );
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

    return (
        <SearchScopeProvider>
            <View style={[styles.w100]}>
                <SearchChartView
                    queryJSON={queryJSON}
                    view={validView}
                    groupBy={validGroupBy}
                    data={sortedData}
                    isLoading={!isSearchDataLoaded(searchResults, queryJSON) || !!searchResults?.search?.isLoading}
                    title={chartTitle}
                    footer={
                        <Button
                            text={translate('common.view')}
                            style={!shouldUseNarrowLayout && styles.alignSelfStart}
                            onPress={() => Navigation.navigate(ROUTES.SEARCH_ROOT.getRoute({query: `${query} view:${validView}`}))}
                        />
                    }
                    containerStyle={[styles.pt1, styles.mh0, styles.mt0]}
                />
            </View>
        </SearchScopeProvider>
    );
}

export default SearchPreviewRenderer;
