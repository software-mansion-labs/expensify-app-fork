import React from 'react';
import {useOnyx} from 'react-native-onyx';
import FullPageNotFoundView from '@components/BlockingViews/FullPageNotFoundView';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import Search from '@components/Search';
import {useSearchContext} from '@components/Search/SearchContext';
import type {SearchQueryJSON} from '@components/Search/types';
import useLocalize from '@hooks/useLocalize';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import {turnOffMobileSelectionMode} from '@libs/actions/MobileSelectionMode';
import Navigation from '@libs/Navigation/Navigation';
import TopBar from '@navigation/AppNavigator/createCustomBottomTabNavigator/TopBar';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import SearchStatusMenu from './SearchStatusMenu';

type SearchPageBottomTabProps = {
    queryJSON?: SearchQueryJSON;
    policyID?: string;
    isCustomQuery: boolean;
};

function SearchPageBottomTab({queryJSON, policyID, isCustomQuery}: SearchPageBottomTabProps) {
    const {translate} = useLocalize();
    const {shouldUseNarrowLayout} = useResponsiveLayout();

    const styles = useThemeStyles();
    const {clearSelectedTransactions} = useSearchContext();
    const [selectionMode] = useOnyx(ONYXKEYS.MOBILE_SELECTION_MODE);

    const handleOnBackButtonPress = () => Navigation.goBack(ROUTES.SEARCH_CENTRAL_PANE.getRoute({query: CONST.SEARCH.TAB.EXPENSE.ALL}));

    return (
        <ScreenWrapper
            testID={SearchPageBottomTab.displayName}
            style={styles.pv0}
            offlineIndicatorStyle={styles.mtAuto}
        >
            <FullPageNotFoundView
                shouldShow={!queryJSON}
                onBackButtonPress={handleOnBackButtonPress}
                shouldShowLink={false}
            >
                {!selectionMode?.isEnabled && queryJSON ? (
                    <>
                        <TopBar
                            activeWorkspaceID={policyID}
                            breadcrumbLabel={translate('common.search')}
                            shouldDisplaySearch={false}
                        />
                        <SearchStatusMenu
                            isCustomQuery={isCustomQuery}
                            queryJSON={queryJSON}
                        />
                    </>
                ) : (
                    <HeaderWithBackButton
                        title={translate('common.selectMultiple')}
                        onBackButtonPress={() => {
                            clearSelectedTransactions();
                            turnOffMobileSelectionMode();
                        }}
                    />
                )}
                {shouldUseNarrowLayout && queryJSON && (
                    <Search
                        queryJSON={queryJSON}
                        isCustomQuery={isCustomQuery}
                    />
                )}
            </FullPageNotFoundView>
        </ScreenWrapper>
    );
}

SearchPageBottomTab.displayName = 'SearchPageBottomTab';

export default SearchPageBottomTab;
