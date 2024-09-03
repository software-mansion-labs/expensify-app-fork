// eslint-disable-next-line import/extensions, prettier/prettier
import type {StackScreenProps} from '@react-navigation/stack';
import React, {useMemo} from 'react';
import {View} from 'react-native';
import {useOnyx} from 'react-native-onyx';
import FullPageNotFoundView from '@components/BlockingViews/FullPageNotFoundView';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import Search from '@components/Search';
import {useSearchContext} from '@components/Search/SearchContext';
import useLocalize from '@hooks/useLocalize';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import {turnOffMobileSelectionMode} from '@libs/actions/MobileSelectionMode';
import BottomTabBar from '@libs/Navigation/AppNavigator/createCustomBottomTabNavigator/BottomTabBar';
import TopBar from '@libs/Navigation/AppNavigator/createCustomBottomTabNavigator/TopBar';
import Navigation from '@libs/Navigation/Navigation';
import type {AuthScreensParamList} from '@libs/Navigation/types';
import * as SearchUtils from '@libs/SearchUtils';
import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';
import SCREENS from '@src/SCREENS';
import SearchStatusMenu from './SearchStatusMenu';

type SearchPageProps = StackScreenProps<AuthScreensParamList, typeof SCREENS.SEARCH.CENTRAL_PANE>;

function SearchPage({route}: SearchPageProps) {
    const {translate} = useLocalize();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const styles = useThemeStyles();

    // TODO: this triggers rerenders
    // const [selectionMode] = useOnyx(ONYXKEYS.MOBILE_SELECTION_MODE);
    const {q, isCustomQuery} = route.params;
    const {clearSelectedTransactions} = useSearchContext();

    const {queryJSON, policyID} = useMemo(() => {
        const parsedQuery = SearchUtils.buildSearchQueryJSON(q);
        const extractedPolicyID = parsedQuery && SearchUtils.getPolicyIDFromSearchQuery(parsedQuery);

        return {queryJSON: parsedQuery, policyID: extractedPolicyID};
    }, [q]);

    const handleOnBackButtonPress = () => Navigation.goBack(ROUTES.SEARCH_CENTRAL_PANE.getRoute({query: CONST.SEARCH.TAB.EXPENSE.ALL}));

    // On small screens this page is not displayed, the configuration is in the file: src/libs/Navigation/AppNavigator/createCustomStackNavigator/index.tsx
    // To avoid calling hooks in the Search component when this page isn't visible, we return null here.
    if (shouldUseNarrowLayout) {
        return null;
    }

    return (
        <ScreenWrapper
            testID={Search.displayName}
            shouldShowOfflineIndicatorInWideScreen
            offlineIndicatorStyle={styles.mtAuto}
        >
            <FullPageNotFoundView
                shouldForceFullScreen
                shouldShow={!queryJSON}
                onBackButtonPress={handleOnBackButtonPress}
                shouldShowLink={false}
            >
                {queryJSON && (
                    <View style={styles.searchSplitContainer}>
                        <View style={styles.searchSidebar}>
                            {/* {!selectionMode?.isEnabled && queryJSON ? ( */}
                            {queryJSON ? (
                                <View>
                                    <TopBar
                                        activeWorkspaceID={policyID}
                                        breadcrumbLabel={translate('common.search')}
                                        shouldDisplaySearch={false}
                                    />
                                    <SearchStatusMenu
                                        isCustomQuery={isCustomQuery}
                                        queryJSON={queryJSON}
                                    />
                                </View>
                            ) : (
                                <HeaderWithBackButton
                                    title={translate('common.selectMultiple')}
                                    onBackButtonPress={() => {
                                        clearSelectedTransactions();
                                        turnOffMobileSelectionMode();
                                    }}
                                />
                            )}
                            <BottomTabBar selectedTab={SCREENS.SEARCH.CENTRAL_PANE} />
                        </View>
                        <Search
                            isCustomQuery={isCustomQuery}
                            queryJSON={queryJSON}
                        />
                    </View>
                )}
            </FullPageNotFoundView>
        </ScreenWrapper>
    );
}

SearchPage.displayName = 'SearchPage';
SearchPage.whyDidYouRender = true;

export default SearchPage;
