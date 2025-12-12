import React, {useCallback} from 'react';
import {View} from 'react-native';
import FullPageNotFoundView from '@components/BlockingViews/FullPageNotFoundView';
import Button from '@components/Button';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import {FallbackAvatar,Plus} from '@components/Icon/Expensicons';
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
import {getLatestError} from '@libs/ErrorUtils';
import {sortAlphabetically} from '@libs/OptionsListUtils';
import {getDisplayNameOrDefault} from '@libs/PersonalDetailsUtils';
import tokenizedSearch from '@libs/tokenizedSearch';
import Navigation from '@navigation/Navigation';
import type {PlatformStackScreenProps} from '@navigation/PlatformStackNavigation/types';
import type {DomainSplitNavigatorParamList} from '@navigation/types';
import {clearAddAdminError, clearRemoveAdminError} from '@userActions/Domain';
import CONST from '@src/CONST';
import {getAdminKey, selectMemberIDs} from '@src/libs/DomainUtils';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

type DomainAdminsPageProps = PlatformStackScreenProps<DomainSplitNavigatorParamList, typeof SCREENS.DOMAIN.SAML>;

type AdminOption = Omit<ListItem, 'accountID' | 'login'> & {
    accountID: number;
    login: string;
};

function DomainMembersPage({route}: DomainAdminsPageProps) {
    const domainID = route.params.accountID;
    const {translate, formatPhoneNumber, localeCompare} = useLocalize();
    const styles = useThemeStyles();
    const illustrations = useMemoizedLazyIllustrations(['LaptopOnDeskWithCoffeeAndKey', 'LockClosed', 'OpenSafe', 'ShieldYellow', 'Members'] as const);

    const [domain, fetchStatus] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${domainID}`, {canBeMissing: false});
    const [memberIDs] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${domainID}`, {
        canBeMissing: true,
        selector: selectMemberIDs,
    });

    const [domainPendingActions] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN_PENDING_ACTIONS}${domainID}`, {
        canBeMissing: true,
    });

    const [domainErrors] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN_ERRORS}${domainID}`, {
        canBeMissing: true,
    });

    const [personalDetails] = useOnyx(ONYXKEYS.PERSONAL_DETAILS_LIST, {canBeMissing: true});
    const shuldShowLoading = fetchStatus.status !== 'loading' && (!domain);
    const {shouldUseNarrowLayout} = useResponsiveLayout();

    const data: AdminOption[] = [];
    for (const accountID of memberIDs ?? []) {
        const details = personalDetails?.[accountID];
        data.push({
            keyForList: String(accountID),
            accountID,
            login: details?.login ?? '',
            text: formatPhoneNumber(getDisplayNameOrDefault(details)),
            alternateText: formatPhoneNumber(details?.login ?? ''),
            icons: [
                {
                    source: details?.avatar ?? FallbackAvatar,
                    name: formatPhoneNumber(details?.login ?? ''),
                    type: CONST.ICON_TYPE_AVATAR,
                    id: accountID,
                },
            ],
            pendingAction: domainPendingActions?.admin?.[accountID],
            errors: getLatestError(domainErrors?.adminErrors?.[accountID]),
        });
    }

    const getHeaderButtons = () => {
        return (
            <View style={[styles.flexRow, styles.gap2]}>
                <Button
                    success
                    onPress={() => {
                        console.log("add member")
                    }}
                    text={translate('domain.members.addMember')}
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
                leftHeaderText={translate('domain.members.title')}
            />
        );
    };

    return (
        <ScreenWrapper
            enableEdgeToEdgeBottomSafeAreaPadding
            shouldEnableMaxHeight
            shouldShowOfflineIndicatorInWideScreen
            testID={DomainMembersPage.displayName}
        >
            <FullPageNotFoundView
                onBackButtonPress={() => Navigation.goBack(ROUTES.WORKSPACES_LIST.route)}
                shouldShow={shuldShowLoading}
                shouldForceFullScreen
                shouldDisplaySearchRouter
            >
                <HeaderWithBackButton
                    title={translate('domain.members.title')}
                    onBackButtonPress={Navigation.popToSidebar}
                    icon={illustrations.Members}
                    shouldShowBackButton={shouldUseNarrowLayout}
                >
                    {!shouldUseNarrowLayout && getHeaderButtons()}
                </HeaderWithBackButton>

                {shouldUseNarrowLayout && <View style={[styles.pl5, styles.pr5]}>{getHeaderButtons()}</View>}
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
                                    label={translate('domain.members.findMember')}
                                    shouldShowEmptyState={!filteredData.length}
                                />
                            ) : null
                        }
                        listHeaderWrapperStyle={[styles.ph9, styles.pv3, styles.pb5]}
                        ListItem={TableListItem}
                        onSelectRow={()=>{}}
                        shouldShowListEmptyContent={false}
                        listItemTitleContainerStyles={shouldUseNarrowLayout ? undefined : [styles.pr3]}
                        showScrollIndicator={false}
                        addBottomSafeAreaPadding
                        customListHeader={getCustomListHeader()}
                        onDismissError={(item) => {
                            const adminKey = getAdminKey(domain, item.accountID);
                            if (item.pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.ADD) {
                                clearAddAdminError(domainID, item.accountID);
                            } else if (item.pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE && adminKey) {
                                clearRemoveAdminError(domainID, item.accountID, adminKey);
                            }
                        }}
                    />
                </ScrollViewWithContext>
            </FullPageNotFoundView>
        </ScreenWrapper>
    );
}

DomainMembersPage.displayName = 'DomainAdminsPage';

export default DomainMembersPage;
