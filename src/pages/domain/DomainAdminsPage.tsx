import React, {useCallback} from 'react';
import {View} from 'react-native';
import FullPageNotFoundView from '@components/BlockingViews/FullPageNotFoundView';
import Button from '@components/Button';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import {FallbackAvatar, Plus} from '@components/Icon/Expensicons';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollViewWithContext from '@components/ScrollViewWithContext';
import SearchBar from '@components/SearchBar';
import CustomListHeader from '@components/SelectionListWithModal/CustomListHeader';
import SelectionList from '@components/SelectionListWithSections';
import TableListItem from '@components/SelectionListWithSections/TableListItem';
import type {ListItem} from '@components/SelectionListWithSections/types';
import {useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useSearchResults from '@hooks/useSearchResults';
import useThemeStyles from '@hooks/useThemeStyles';
import {sortAlphabetically} from '@libs/OptionsListUtils';
import {getDisplayNameOrDefault} from '@libs/PersonalDetailsUtils';
import tokenizedSearch from '@libs/tokenizedSearch';
import Navigation from '@navigation/Navigation';
import type {PlatformStackScreenProps} from '@navigation/PlatformStackNavigation/types';
import type {DomainSplitNavigatorParamList} from '@navigation/types';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

type DomainAdminsPageProps = PlatformStackScreenProps<DomainSplitNavigatorParamList, typeof SCREENS.DOMAIN.SAML>;

type AdminOption = Omit<ListItem, 'accountID' | 'login'> & {
    accountID: number;
    login: string;
};

function DomainAdminsPage({route}: DomainAdminsPageProps) {
    const domainID = route.params.accountID;
    const {translate, formatPhoneNumber, localeCompare} = useLocalize();
    const styles = useThemeStyles();
    const illustrations = useMemoizedLazyIllustrations(['LaptopOnDeskWithCoffeeAndKey', 'LockClosed', 'OpenSafe', 'ShieldYellow', 'Members'] as const);

    const [domain] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${domainID}`, {canBeMissing: true});
    const [isAdmin] = useOnyx(`${ONYXKEYS.COLLECTION.SHARED_NVP_PRIVATE_ADMIN_ACCESS}${domainID}`, {canBeMissing: false});
    const [personalDetails] = useOnyx(ONYXKEYS.PERSONAL_DETAILS_LIST, {canBeMissing: true});

    const {shouldUseNarrowLayout} = useResponsiveLayout();

    const currentUserAccountID = 16530855;
    const details = personalDetails?.[currentUserAccountID];
    const data: AdminOption[] = [];
    for (let i = 1; i < 15; i++) {
        data.push({
            keyForList: String(i),
            accountID: currentUserAccountID,
            login: details?.login ?? '',
            text: formatPhoneNumber(getDisplayNameOrDefault(details)),
            alternateText: formatPhoneNumber(details?.login ?? ''),
            icons: [
                {
                    source: details?.avatar ?? FallbackAvatar,
                    name: formatPhoneNumber(details?.login ?? ''),
                    type: CONST.ICON_TYPE_AVATAR,
                    id: currentUserAccountID,
                },
            ],
            errors: {
                // error1: "Unable to revoke admin access for this user. Please try again.",
            },
        });
    }

    const getHeaderButtons = () => {
        if (!isAdmin) {
            return null;
        }
        return (
            <View style={[styles.flexRow, styles.gap2]}>
                <Button
                    success
                    onPress={() => {}}
                    text={translate('domain.admins.addAdmin')}
                    icon={Plus}
                    innerStyles={[shouldUseNarrowLayout && styles.alignItemsCenter]}
                    style={[shouldUseNarrowLayout && styles.flexGrow1, shouldUseNarrowLayout && styles.mb3]}
                />
            </View>
        );
    };

    const filterMember = useCallback((adminOption: AdminOption, searchQuery: string) => {
        const results = tokenizedSearch([adminOption], searchQuery, (option) => [option.text ?? '', option.alternateText ?? '']);
        return results.length > 0;
    }, []);
    const sortMembers = useCallback((adminOptions: AdminOption[]) => sortAlphabetically(adminOptions, 'text', localeCompare), [localeCompare]);
    const [inputValue, setInputValue, filteredData] = useSearchResults(data, filterMember, sortMembers);

    const getCustomListHeader = () => {
        if (filteredData.length === 0) {
            return null;
        }

        return (
            <CustomListHeader
                canSelectMultiple={false}
                leftHeaderText={translate('domain.admins.title')}
            />
        );
    };

    /** Opens the member details page */
    const openMemberDetails = useCallback(
        (item: AdminOption) => {
            Navigation.setNavigationActionToMicrotaskQueue(() => {
                Navigation.navigate(ROUTES.DOMAIN_ADMIN_DETAILS.getRoute(domainID, item.accountID));
            });
        },
        [domainID],
    );

    return (
        <ScreenWrapper
            enableEdgeToEdgeBottomSafeAreaPadding
            shouldEnableMaxHeight
            shouldShowOfflineIndicatorInWideScreen
            testID={DomainAdminsPage.displayName}
        >
            <FullPageNotFoundView
                onBackButtonPress={() => Navigation.goBack(ROUTES.WORKSPACES_LIST.route)}
                shouldShow={!domain || !isAdmin}
                shouldForceFullScreen
                shouldDisplaySearchRouter
            >
                <HeaderWithBackButton
                    title={translate('domain.admins.title')}
                    onBackButtonPress={Navigation.popToSidebar}
                    icon={illustrations.Members}
                    shouldShowBackButton={shouldUseNarrowLayout}
                >
                    {getHeaderButtons()}
                </HeaderWithBackButton>

                <ScrollViewWithContext
                    keyboardShouldPersistTaps="handled"
                    addBottomSafeAreaPadding
                    style={[styles.settingsPageBackground, styles.flex1, styles.w100]}
                >
                    <SelectionList
                        sections={[{data: filteredData}]}
                        shouldShowRightCaret
                        canSelectMultiple={false}
                        listHeaderContent={
                            data.length > CONST.SEARCH_ITEM_LIMIT ? (
                                <SearchBar
                                    inputValue={inputValue}
                                    onChangeText={setInputValue}
                                    label={translate('domain.admins.findAdmin')}
                                    shouldShowEmptyState={!filteredData.length}
                                />
                            ) : null
                        }
                        listHeaderWrapperStyle={[styles.ph9, styles.pv3, styles.pb5]}
                        ListItem={TableListItem}
                        onSelectRow={openMemberDetails}
                        shouldShowListEmptyContent={false}
                        listItemTitleContainerStyles={shouldUseNarrowLayout ? undefined : [styles.pr3]}
                        showScrollIndicator={false}
                        addBottomSafeAreaPadding
                        customListHeader={getCustomListHeader()}
                        onDismissError={(item) => {
                            if (item.pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE) {
                                // clearDeleteMemberError(route.params.policyID, item.login);
                            } else {
                                // clearAddMemberError(route.params.policyID, item.login, item.accountID);
                            }
                        }}
                    />
                </ScrollViewWithContext>
            </FullPageNotFoundView>
        </ScreenWrapper>
    );
}

DomainAdminsPage.displayName = 'DomainAdminsPage';

export default DomainAdminsPage;
