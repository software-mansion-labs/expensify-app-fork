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
import * as SearchUtils from '@libs/SearchUtils';
import TopBar from '@navigation/AppNavigator/createCustomBottomTabNavigator/TopBar';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import SearchTypeMenu from './SearchTypeMenu';

type SearchPageBottomTabProps = {
    queryJSON?: SearchQueryJSON;
    policyID?: string;
};

function SearchPageBottomTab({queryJSON, policyID}: SearchPageBottomTabProps) {
    const {translate} = useLocalize();
    const {shouldUseNarrowLayout} = useResponsiveLayout();

    const styles = useThemeStyles();
    const {clearSelectedTransactions} = useSearchContext();
    const [selectionMode] = useOnyx(ONYXKEYS.MOBILE_SELECTION_MODE);

    const handleOnBackButtonPress = () => Navigation.goBack(ROUTES.SEARCH_CENTRAL_PANE.getRoute({query: SearchUtils.buildCannedSearchQuery()}));

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
                            shouldDisplaySearchRouter={shouldUseNarrowLayout}
                            isCustomSearchQuery={shouldUseNarrowLayout && !SearchUtils.isCannedSearchQuery(queryJSON)}
                        />
                        <SearchTypeMenu queryJSON={queryJSON} />
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
                {shouldUseNarrowLayout && queryJSON && <Search queryJSON={queryJSON} />}
            </FullPageNotFoundView>
        </ScreenWrapper>
    );
}

SearchPageBottomTab.displayName = 'SearchPageBottomTab';

export default SearchPageBottomTab;
