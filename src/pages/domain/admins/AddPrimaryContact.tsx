import React, {useCallback, useEffect, useMemo, useState} from 'react';
import type {SectionListData} from 'react-native';
import FormAlertWithSubmitButton from '@components/FormAlertWithSubmitButton';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import SelectionList from '@components/SelectionListWithSections';
import InviteMemberListItem from '@components/SelectionListWithSections/InviteMemberListItem';
import type {Section} from '@components/SelectionListWithSections/types';
import type {WithNavigationTransitionEndProps} from '@components/withNavigationTransitionEnd';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useSearchSelector from '@hooks/useSearchSelector';
import useThemeStyles from '@hooks/useThemeStyles';
import {clearErrors} from '@libs/actions/Policy/Policy';
import {searchInServer} from '@libs/actions/Report';
import {canUseTouchScreen} from '@libs/DeviceCapabilities';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {OptionData} from '@libs/ReportUtils';
import type {SettingsNavigatorParamList} from '@navigation/types';
import type {WithPolicyAndFullscreenLoadingProps} from '@pages/workspace/withPolicyAndFullscreenLoading';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

type Sections = SectionListData<OptionData, Section<OptionData>>;

type WorkspaceInvitePageProps = WithPolicyAndFullscreenLoadingProps &
    WithNavigationTransitionEndProps &
    PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.INVITE>;

function AddPrimaryContact({route}: WorkspaceInvitePageProps) {
    const {translate} = useLocalize();
    const [didScreenTransitionEnd, setDidScreenTransitionEnd] = useState(false);
    const [isSearchingForReports] = useOnyx(ONYXKEYS.IS_SEARCHING_FOR_REPORTS, {initWithStoredValues: false, canBeMissing: true});
    const [actualSelectedUser, setActualSelectedUser] = useState<OptionData | null>(null);

    const goBackToSettings = () => {
        Navigation.navigate(ROUTES.DOMAIN_ADMINS_SETTINGS.getRoute(1));
    };

    const {searchTerm, setSearchTerm, availableOptions, toggleSelection, areOptionsInitialized, onListEndReached} = useSearchSelector({
        selectionMode: CONST.SEARCH_SELECTOR.SELECTION_MODE_SINGLE,
        searchContext: CONST.SEARCH_SELECTOR.SEARCH_CONTEXT_MEMBER_INVITE,
        includeUserToInvite: true,
        includeRecentReports: false,
        shouldInitialize: didScreenTransitionEnd,
        onSingleSelect: (option) => {
            const result = {...option, isSelected: true};
            if (option.accountID === actualSelectedUser?.accountID) {
                setActualSelectedUser(null);
            } else {
                setActualSelectedUser(result);
            }
            goBackToSettings();
        },
    });

    const handleToggleSelection = useCallback(
        (option: OptionData) => {
            toggleSelection(option);
        },
        [toggleSelection],
    );

    const sections: Sections[] = useMemo(() => {
        const sectionsArr: Sections[] = [];

        if (!areOptionsInitialized) {
            return [];
        }

        if (actualSelectedUser) {
            sectionsArr.push({
                title: undefined,
                data: [actualSelectedUser],
            });
        }

        const filteredPersonalDetails = availableOptions.personalDetails.filter((option) => option.accountID !== actualSelectedUser?.accountID);

        if (filteredPersonalDetails.length > 0) {
            sectionsArr.push({
                title: translate('common.contacts'),
                data: filteredPersonalDetails,
            });
        }

        if (availableOptions.userToInvite) {
            const isSelected = actualSelectedUser?.login === availableOptions.userToInvite.login;

            if (!isSelected) {
                sectionsArr.push({
                    title: undefined,
                    data: [availableOptions.userToInvite],
                });
            }
        }

        return sectionsArr;
    }, [areOptionsInitialized, actualSelectedUser, availableOptions.personalDetails, availableOptions.userToInvite, translate]);

    useEffect(() => {
        searchInServer(searchTerm);
    }, [searchTerm]);

    return (
        <ScreenWrapper
            shouldEnableMaxHeight
            shouldUseCachedViewportHeight
            testID={AddPrimaryContact.displayName}
            enableEdgeToEdgeBottomSafeAreaPadding
            onEntryTransitionEnd={() => setDidScreenTransitionEnd(true)}
        >
            <HeaderWithBackButton
                title={translate('domain.admins.addPrimaryContact')}
                onBackButtonPress={() => {
                    clearErrors(route.params.policyID);
                    goBackToSettings();
                }}
            />
            <SelectionList
                canSelectMultiple={false}
                sections={sections}
                ListItem={InviteMemberListItem}
                textInputLabel={translate('selectionList.nameEmailOrPhoneNumber')}
                textInputValue={searchTerm}
                onChangeText={(value) => {
                    setSearchTerm(value);
                }}
                onSelectRow={handleToggleSelection}
                showScrollIndicator
                showLoadingPlaceholder={!areOptionsInitialized || !didScreenTransitionEnd}
                shouldPreventDefaultFocusOnSelectRow={!canUseTouchScreen()}
                isLoadingNewOptions={!!isSearchingForReports}
                addBottomSafeAreaPadding
                onEndReached={onListEndReached}
            />
        </ScreenWrapper>
    );
}

AddPrimaryContact.displayName = 'WorkspaceInvitePage';

export default AddPrimaryContact;
