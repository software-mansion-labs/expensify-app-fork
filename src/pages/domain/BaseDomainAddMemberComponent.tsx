import {Str} from 'expensify-common';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import type {SectionListData} from 'react-native';
import FormAlertWithSubmitButton from '@components/FormAlertWithSubmitButton';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import SelectionList from '@components/SelectionListWithSections';
import InviteMemberListItem from '@components/SelectionListWithSections/InviteMemberListItem';
import type {Section} from '@components/SelectionListWithSections/types';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useSearchSelector from '@hooks/useSearchSelector';
import useThemeStyles from '@hooks/useThemeStyles';
import {searchInServer} from '@libs/actions/Report';
import {canUseTouchScreen} from '@libs/DeviceCapabilities';
import Navigation from '@libs/Navigation/Navigation';
import type {OptionData} from '@libs/ReportUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

type Sections = SectionListData<OptionData, Section<OptionData>>;

type BaseDomainAddMemberComponentProps = {
    /** The domain ID */
    domainID: number;

    /** Title for the header */
    headerTitle: string;

    /** Text for the submit button */
    submitButtonText: string;

    /** Function called when the back button is pressed */
    onBackButtonPress: () => void;

    /** Function called when the user confirms the invitation */
    onInvite: (accountID: number, login: string, domainName: string) => void;

    /** List of accountIDs to exclude from the search results (e.g. existing admins) */
    excludeAccountIDs?: number[];
};

function BaseDomainAddMemberComponent({
                                          domainID,
                                          headerTitle,
                                          submitButtonText,
                                          onBackButtonPress,
                                          onInvite,
                                          excludeAccountIDs = [],
                                      }: BaseDomainAddMemberComponentProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const [didScreenTransitionEnd, setDidScreenTransitionEnd] = useState(false);

    // Onyx hooks
    const [isSearchingForReports] = useOnyx(ONYXKEYS.IS_SEARCHING_FOR_REPORTS, {initWithStoredValues: false, canBeMissing: true});
    const [domain] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${domainID}`, {canBeMissing: true});

    const domainName = domain ? Str.extractEmailDomain(domain.email) : undefined;
    const [actualSelectedUser, setActualSelectedUser] = useState<OptionData | null>(null);

    const {searchTerm, setSearchTerm, availableOptions, toggleSelection, areOptionsInitialized, onListEndReached} = useSearchSelector({
        selectionMode: CONST.SEARCH_SELECTOR.SELECTION_MODE_SINGLE,
        searchContext: CONST.SEARCH_SELECTOR.SEARCH_CONTEXT_MEMBER_INVITE,
        includeUserToInvite: true,
        includeRecentReports: false,
        shouldInitialize: didScreenTransitionEnd,
        onSingleSelect: (option) => {
            const result = {...option, isSelected: true};
            setActualSelectedUser(result);
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

        const filteredPersonalDetails = availableOptions.personalDetails
            .filter((option) => option.accountID !== actualSelectedUser?.accountID)
            .filter((option) => option.accountID && !excludeAccountIDs.includes(option.accountID));

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
    }, [areOptionsInitialized, actualSelectedUser, availableOptions.personalDetails, availableOptions.userToInvite, translate, excludeAccountIDs]);

    const inviteUser = useCallback(() => {
        if (!actualSelectedUser || !actualSelectedUser.accountID || !actualSelectedUser.login || !domainName) {
            return;
        }

        onInvite(actualSelectedUser.accountID, actualSelectedUser.login, domainName);
        Navigation.dismissModal();
    }, [actualSelectedUser, domainName, onInvite]);

    const footerContent = useMemo(
        () => (
            <FormAlertWithSubmitButton
                isDisabled={!actualSelectedUser}
                isAlertVisible={false}
                buttonText={submitButtonText}
                onSubmit={inviteUser}
                containerStyles={[styles.flexReset, styles.flexGrow0, styles.flexShrink0, styles.flexBasisAuto]}
                enabledWhenOffline
            />
        ),
        [actualSelectedUser, inviteUser, styles.flexBasisAuto, styles.flexGrow0, styles.flexReset, styles.flexShrink0, submitButtonText],
    );

    useEffect(() => {
        searchInServer(searchTerm);
    }, [searchTerm]);

    return (
        <ScreenWrapper
            shouldEnableMaxHeight
            shouldUseCachedViewportHeight
            testID={BaseDomainAddMemberComponent.displayName}
            enableEdgeToEdgeBottomSafeAreaPadding
            onEntryTransitionEnd={() => setDidScreenTransitionEnd(true)}
        >
            <HeaderWithBackButton
                title={headerTitle}
                onBackButtonPress={onBackButtonPress}
            />
            <SelectionList
                canSelectMultiple
                sections={sections}
                ListItem={InviteMemberListItem}
                textInputLabel={translate('selectionList.nameEmailOrPhoneNumber')}
                textInputValue={searchTerm}
                onChangeText={(value) => {
                    setSearchTerm(value);
                }}
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
        </ScreenWrapper>
    );
}

BaseDomainAddMemberComponent.displayName = 'BaseDomainAddMemberComponent';

export default BaseDomainAddMemberComponent;
