import isEmpty from 'lodash/isEmpty';
import React, {useCallback, useMemo} from 'react';
import {useOnyx} from 'react-native-onyx';
import {useOptionsList} from '@components/OptionListContextProvider';
import ScreenWrapper from '@components/ScreenWrapper';
import SelectionList from '@components/SelectionList';
import UserListItem from '@components/SelectionList/UserListItem';
import useCancelSearchOnModalClose from '@hooks/useCancelSearchOnModalClose';
import useDebouncedState from '@hooks/useDebouncedState';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import {setShareFileReceiver} from '@libs/actions/ShareFile';
import Navigation from '@libs/Navigation/Navigation';
import * as OptionsListUtils from '@libs/OptionsListUtils';
import type {OptionData} from '@libs/ReportUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

type ChatFinderPageSectionItem = {
    data: OptionData[];
    shouldShow: boolean;
};

type ChatFinderPageSectionList = ChatFinderPageSectionItem[];

function ShareTab() {
    const {translate} = useLocalize();
    const {isOffline} = useNetwork();
    const {options, areOptionsInitialized} = useOptionsList();
    const [betas] = useOnyx(ONYXKEYS.BETAS);
    const [isSearchingForReports] = useOnyx(ONYXKEYS.IS_SEARCHING_FOR_REPORTS, {initWithStoredValues: false});

    const offlineMessage: string = isOffline ? `${translate('common.youAppearToBeOffline')} ${translate('search.resultsAreLimited')}` : '';

    const [searchValue, debouncedSearchValue, setSearchValue] = useDebouncedState('');

    const updateSearchValue = useCallback(
        (value: string) => {
            setSearchValue(value);
        },
        [setSearchValue],
    );
    useCancelSearchOnModalClose();

    const searchOptions = useMemo(() => {
        if (!areOptionsInitialized) {
            return {
                recentReports: [],
                personalDetails: [],
                userToInvite: null,
                currentUserOption: null,
                categoryOptions: [],
                tagOptions: [],
                taxRatesOptions: [],
                headerMessage: '',
            };
        }
        const optionList = OptionsListUtils.getSearchOptions(options, '', betas ?? []);
        const header = OptionsListUtils.getHeaderMessage(optionList.recentReports.length + optionList.personalDetails.length !== 0, !!optionList.userToInvite, '');
        return {...optionList, headerMessage: header};
    }, [areOptionsInitialized, betas, options]);

    const filteredOptions = useMemo(() => {
        if (debouncedSearchValue.trim() === '') {
            return {
                recentReports: [],
                personalDetails: [],
                userToInvite: null,
                headerMessage: '',
            };
        }

        const newOptions = OptionsListUtils.filterOptions(searchOptions, debouncedSearchValue, {sortByReportTypeInSearch: true, preferChatroomsOverThreads: true});

        const header = OptionsListUtils.getHeaderMessage(newOptions.recentReports.length + Number(!!newOptions.userToInvite) > 0, false, debouncedSearchValue);
        return {
            recentReports: newOptions.recentReports,
            personalDetails: newOptions.personalDetails,
            userToInvite: newOptions.userToInvite,
            headerMessage: header,
        };
    }, [debouncedSearchValue, searchOptions]);

    const {recentReports, personalDetails: localPersonalDetails, userToInvite, headerMessage} = debouncedSearchValue.trim() !== '' ? filteredOptions : searchOptions;

    const sections = useMemo((): ChatFinderPageSectionList => {
        const newSections: ChatFinderPageSectionList = [];

        if (recentReports?.length > 0) {
            newSections.push({
                data: recentReports,
                shouldShow: true,
            });
        }

        if (localPersonalDetails.length > 0) {
            newSections.push({
                data: localPersonalDetails,
                shouldShow: true,
            });
        }

        if (!isEmpty(userToInvite)) {
            newSections.push({
                data: [userToInvite],
                shouldShow: true,
            });
        }

        return newSections;
    }, [localPersonalDetails, recentReports, userToInvite]);

    const selectReport = (option: OptionData) => {
        if (!option) {
            return;
        }

        setShareFileReceiver(option);
        Navigation.navigate(ROUTES.SHARE_MESSAGE);
    };

    return (
        <ScreenWrapper testID={ShareTab.displayName}>
            <SelectionList<OptionData>
                sections={areOptionsInitialized ? sections : CONST.EMPTY_ARRAY}
                ListItem={UserListItem}
                textInputValue={searchValue}
                textInputLabel={translate('selectionList.nameEmailOrPhoneNumber')}
                textInputHint={offlineMessage}
                onChangeText={updateSearchValue}
                headerMessage={headerMessage}
                onSelectRow={selectReport}
                shouldSingleExecuteRowSelect
                showLoadingPlaceholder={!areOptionsInitialized}
                isLoadingNewOptions={!!isSearchingForReports}
            />
        </ScreenWrapper>
    );
}

ShareTab.displayName = 'ShareTab';

export default ShareTab;
