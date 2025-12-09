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
import {READ_COMMANDS} from '@libs/API/types';
import {canUseTouchScreen} from '@libs/DeviceCapabilities';
import HttpUtils from '@libs/HttpUtils';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import {getHeaderMessage} from '@libs/OptionsListUtils';
import {goBackFromInvalidPolicy} from '@libs/PolicyUtils';
import type {OptionData} from '@libs/ReportUtils';
import type {SettingsNavigatorParamList} from '@navigation/types';
import AccessOrNotFoundWrapper from '@pages/workspace/AccessOrNotFoundWrapper';
import type {WithPolicyAndFullscreenLoadingProps} from '@pages/workspace/withPolicyAndFullscreenLoading';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type SCREENS from '@src/SCREENS';
import type {InvitedEmailsToAccountIDs} from '@src/types/onyx';
import type {Errors} from '@src/types/onyx/OnyxCommon';
import {isEmptyObject} from '@src/types/utils/EmptyObject';
import ConfirmModal from '@components/ConfirmModal';

type Sections = SectionListData<OptionData, Section<OptionData>>;

type WorkspaceInvitePageProps = WithPolicyAndFullscreenLoadingProps &
    WithNavigationTransitionEndProps &
    PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.INVITE>;

function DomainAddAdminPage({route, policy}: WorkspaceInvitePageProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const [didScreenTransitionEnd, setDidScreenTransitionEnd] = useState(false);
    const [isSearchingForReports] = useOnyx(ONYXKEYS.IS_SEARCHING_FOR_REPORTS, {initWithStoredValues: false, canBeMissing: true});
    const [countryCode = CONST.DEFAULT_COUNTRY_CODE] = useOnyx(ONYXKEYS.COUNTRY_CODE, {canBeMissing: false});
    const [shouldShowConfirmModal, setShouldShowConfirmModal] = useState(false);
    const [selectedUserDisplayName, setSelectedUserDisplayName] = useState('');
    // const [personalDetails] = useOnyx(ONYXKEYS.PERSONAL_DETAILS_LIST, {canBeMissing: false});

    // const excludedUsers = useMemo(() => {
    //     return ineligibleInvites.reduce(
    //         (acc, login) => {
    //             acc[login] = true;
    //             return acc;
    //         },
    //         {} as Record<string, boolean>,
    //     );
    // }, [policy?.employeeList]);

    const {searchTerm, setSearchTerm, availableOptions, selectedOptions, selectedOptionsForDisplay, toggleSelection, areOptionsInitialized, onListEndReached, searchOptions} =
        useSearchSelector({
            selectionMode: CONST.SEARCH_SELECTOR.SELECTION_MODE_MULTI,
            searchContext: CONST.SEARCH_SELECTOR.SEARCH_CONTEXT_MEMBER_INVITE,
            includeUserToInvite: true,
            includeRecentReports: false,
            shouldInitialize: didScreenTransitionEnd,
        });

    const sections: Sections[] = useMemo(() => {
        const sectionsArr: Sections[] = [];

        if (!areOptionsInitialized) {
            return [];
        }

        // Selected options section
        if (selectedOptionsForDisplay.length > 0) {
            sectionsArr.push({
                title: undefined,
                data: selectedOptionsForDisplay,
            });
        }

        // Contacts section
        if (availableOptions.personalDetails.length > 0) {
            sectionsArr.push({
                title: translate('common.contacts'),
                data: availableOptions.personalDetails,
            });
        }

        // User to invite section
        if (availableOptions.userToInvite) {
            sectionsArr.push({
                title: undefined,
                data: [availableOptions.userToInvite],
            });
        }

        return sectionsArr;
    }, [areOptionsInitialized, selectedOptionsForDisplay, availableOptions.personalDetails, availableOptions.userToInvite, translate]);

    const handleToggleSelection = useCallback(
        (option: OptionData) => {
            toggleSelection(option);
        },
        [toggleSelection],
    );

    const inviteUser = useCallback(() => {
        const errors: Errors = {};
        if (selectedOptions.length <= 0) {
            errors.noUserSelected = 'true';
        }
        for (const option of selectedOptions) {
            setSelectedUserDisplayName(option.displayName??"")
        }
        setShouldShowConfirmModal(true)
    }, [selectedOptions]);

    const headerMessage = useMemo(() => {
        const searchValue = searchTerm.trim().toLowerCase();
        if (!availableOptions.userToInvite && CONST.EXPENSIFY_EMAILS_OBJECT[searchValue]) {
            return translate('messages.errorMessageInvalidEmail');
        }
        if (!availableOptions.userToInvite) {
            return 'cokolwiek';
        }
        return getHeaderMessage(searchOptions.personalDetails.length + selectedOptions.length !== 0, !!searchOptions.userToInvite, searchValue, countryCode, false);
    }, [searchTerm, availableOptions.userToInvite, countryCode, searchOptions.personalDetails.length, searchOptions.userToInvite, selectedOptions.length, translate]);

    const footerContent = useMemo(
        () => (
            <FormAlertWithSubmitButton
                isDisabled={!selectedOptions.length}
                isAlertVisible={false}
                buttonText={translate('domain.admins.invite')}
                onSubmit={inviteUser}
                message={policy?.alertMessage ?? ''}
                containerStyles={[styles.flexReset, styles.flexGrow0, styles.flexShrink0, styles.flexBasisAuto]}
                enabledWhenOffline
            />
        ),
        [inviteUser, policy?.alertMessage, selectedOptions.length, styles.flexBasisAuto, styles.flexGrow0, styles.flexReset, styles.flexShrink0, translate],
    );

    useEffect(() => {
        searchInServer(searchTerm);
    }, [searchTerm]);

    return (
        <ScreenWrapper
            shouldEnableMaxHeight
            shouldUseCachedViewportHeight
            testID={DomainAddAdminPage.displayName}
            enableEdgeToEdgeBottomSafeAreaPadding
            onEntryTransitionEnd={() => setDidScreenTransitionEnd(true)}
        >
            <HeaderWithBackButton
                title={translate('domain.admins.addAdmin')}
                subtitle="xd"
                onBackButtonPress={() => {
                    clearErrors(route.params.policyID);
                    Navigation.goBack(route.params.backTo);
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
                headerMessage={headerMessage}
                onSelectRow={handleToggleSelection}
                onConfirm={inviteUser}
                showScrollIndicator
                showLoadingPlaceholder={!areOptionsInitialized || !didScreenTransitionEnd}
                shouldPreventDefaultFocusOnSelectRow={!canUseTouchScreen()}
                footerContent={footerContent}
                isLoadingNewOptions={!!isSearchingForReports}
                addBottomSafeAreaPadding
                onEndReached={onListEndReached}
            />
            <ConfirmModal
                title={`Invite ${selectedUserDisplayName} to be admin`}
                isVisible={shouldShowConfirmModal}
                onConfirm={() => setShouldShowConfirmModal(false)}
                onCancel={() => setShouldShowConfirmModal(false)}
                confirmText={translate('common.buttonConfirm')}
                cancelText={"No invite :("}
                shouldShowCancelButton
            />
        </ScreenWrapper>
    );
}

DomainAddAdminPage.displayName = 'WorkspaceInvitePage';

export default DomainAddAdminPage;
