import React, { useMemo } from 'react';
import FullPageNotFoundView from '@components/BlockingViews/FullPageNotFoundView';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import { FallbackAvatar } from '@components/Icon/Expensicons';
import ScreenWrapper from '@components/ScreenWrapper';
import SelectionList from '@components/SelectionList';
import InviteMemberListItem from '@components/SelectionList/ListItem/InviteMemberListItem';
import type { ListItem } from '@components/SelectionListWithSections/types';
import useDebouncedState from '@hooks/useDebouncedState';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import { selectAdminIDs } from '@libs/DomainUtils';
import type { PlatformStackScreenProps } from '@libs/Navigation/PlatformStackNavigation/types';
import { getSearchValueForPhoneOrEmail, sortAlphabetically } from '@libs/OptionsListUtils';
import { getDisplayNameOrDefault } from '@libs/PersonalDetailsUtils';
import tokenizedSearch from '@libs/tokenizedSearch';
import Navigation from '@navigation/Navigation';
import type { SettingsNavigatorParamList } from '@navigation/types';
import { choosePrimaryContact } from '@userActions/Domain';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type SCREENS from '@src/SCREENS';


type AdminOption = Omit<ListItem, 'accountID' | 'login'> & {
    accountID: number;
    login: string;
};
type DomainAddPrimaryContactPage = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.DOMAIN.ADD_PRIMARY_CONTACT>;

function AddPrimaryContactPage({route}: DomainAddPrimaryContactPage) {
    const domainID = route.params.accountID;
    const {translate, formatPhoneNumber, localeCompare} = useLocalize();
    const [adminIDs] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${domainID}`, {
        canBeMissing: true,
        selector: selectAdminIDs,
    });
    const [domainPendingActions] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN_PENDING_ACTIONS}${domainID}`, {
        canBeMissing: true,
    });
    const [personalDetails] = useOnyx(ONYXKEYS.PERSONAL_DETAILS_LIST, {canBeMissing: true});
    const [searchTerm, debouncedSearchTerm, setSearchTerm] = useDebouncedState('');
    const [countryCode = CONST.DEFAULT_COUNTRY_CODE] = useOnyx(ONYXKEYS.COUNTRY_CODE, {canBeMissing: false});
    const [domainSettings] = useOnyx(`${ONYXKEYS.COLLECTION.SHARED_NVP_PRIVATE_DOMAIN_MEMBER}${route.params.accountID}`, {
        canBeMissing: false,
    });
    const currentlySelectedUser = domainSettings?.settings?.technicalContactEmail;

    const data: AdminOption[] = [];
    for (const accountID of adminIDs??[]) {
        const details = personalDetails?.[accountID];
        data.push({
            isSelected: details?.login === currentlySelectedUser,
            keyForList: String(accountID ?? ''),
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
            errors: {
                // error1: "Unable to revoke admin access for this user. Please try again.",
            },
        });
    }

    const filteredData = useMemo(() => {
        const filteredApprovers =
            debouncedSearchTerm !== '' ? tokenizedSearch(data, getSearchValueForPhoneOrEmail(debouncedSearchTerm, countryCode), (option) => [option.text ?? '', option.login ?? '']) : data;

        return sortAlphabetically(filteredApprovers, 'text', localeCompare);
    }, [debouncedSearchTerm, data, countryCode, localeCompare]);

    const textInputOptions = useMemo(
        () => ({
            label: translate('selectionList.findMember'),
            value: searchTerm,
            onChangeText: setSearchTerm,
            headerMessage: searchTerm && !data?.length ? translate('common.noResultsFound') : '',
        }),
        [translate, searchTerm, setSearchTerm, data?.length],
    );

    return (
        <ScreenWrapper
            testID={AddPrimaryContactPage.displayName}
            enableEdgeToEdgeBottomSafeAreaPadding
        >
            <FullPageNotFoundView
                onBackButtonPress={Navigation.goBack}
                addBottomSafeAreaPadding
            >
                <HeaderWithBackButton
                    title={translate('domain.admins.addPrimaryContact')}
                    onBackButtonPress={Navigation.goBack}
                />
                <SelectionList
                    data={filteredData}
                    onSelectRow={(option) => {
                        choosePrimaryContact(route.params.accountID, option?.login === currentlySelectedUser ? null : option?.login, currentlySelectedUser);
                        Navigation.goBack();
                    }}
                    ListItem={InviteMemberListItem}
                    canSelectMultiple={false}
                    // initiallyFocusedItemKey={initiallyFocusedOptionKey}
                    shouldShowTextInput
                    textInputOptions={textInputOptions}
                    addBottomSafeAreaPadding
                    showScrollIndicator
                />
            </FullPageNotFoundView>
        </ScreenWrapper>
    );
}

AddPrimaryContactPage.displayName = 'AddPrimaryContactPage';

export default AddPrimaryContactPage;
