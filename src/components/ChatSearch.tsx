import {isEmpty} from 'lodash';
import {useEffect, useMemo, useState} from 'react';
import type {SectionListData} from 'react-native';
import {View} from 'react-native';
import type {OnyxCollection, OnyxEntry} from 'react-native-onyx';
import {withOnyx} from 'react-native-onyx';
import useAutoFocusInput from '@hooks/useAutoFocusInput';
import useDebouncedState from '@hooks/useDebouncedState';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useThemeStyles from '@hooks/useThemeStyles';
import type {MaybePhraseKey} from '@libs/Localize';
import Navigation from '@libs/Navigation/Navigation';
import * as OptionsListUtils from '@libs/OptionsListUtils';
import Performance from '@libs/Performance';
import * as ReportUtils from '@libs/ReportUtils';
import * as Report from '@userActions/Report';
import Timing from '@userActions/Timing';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Beta, Report as ReportType} from '@src/types/onyx';
import {usePersonalDetails} from './OnyxProvider';
import SelectionList from './SelectionList';
import type {Section} from './SelectionList/types';
import UserListItem from './SelectionList/UserListItem';

type ChatSearchWithOnyxProps = {
    /** Beta features list */
    betas: OnyxEntry<Beta[]>;

    /** All reports shared with the user */
    reports: OnyxCollection<ReportType>;

    /** Whether we are searching for reports in the server */
    isSearchingForReports: OnyxEntry<boolean>;
};

type ChatSearchProps = ChatSearchWithOnyxProps & {
    onSelectChat: () => void;
};

function ChatSearch({betas = [], reports = {}, isSearchingForReports, onSelectChat}: ChatSearchProps) {
    const [didScreenTransitionEnd, setDidScreenTransitionEnd] = useState(false);
    const [searchValue, debouncedSearchValue, setSearchValue] = useDebouncedState('');
    const {translate} = useLocalize();
    const {isOffline} = useNetwork();
    const themeStyles = useThemeStyles();

    const personalDetails = usePersonalDetails();

    const offlineMessage: MaybePhraseKey = isOffline ? [`${translate('common.youAppearToBeOffline')} ${translate('search.resultsAreLimited')}`, {isTranslated: true}] : '';

    useEffect(() => {
        Timing.start(CONST.TIMING.SEARCH_RENDER);
        Performance.markStart(CONST.TIMING.SEARCH_RENDER);
    }, []);

    useEffect(() => {
        Report.searchInServer(debouncedSearchValue.trim());
    }, [debouncedSearchValue]);

    const {
        recentReports,
        personalDetails: localPersonalDetails,
        userToInvite,
        headerMessage,
    } = useMemo(() => {
        if (!didScreenTransitionEnd) {
            return {
                recentReports: [],
                personalDetails: [],
                userToInvite: {},
                headerMessage: '',
            };
        }
        const options = OptionsListUtils.getSearchOptions(reports, personalDetails, debouncedSearchValue.trim(), betas ?? undefined);
        const header = OptionsListUtils.getHeaderMessage(options.recentReports.length + options.personalDetails.length !== 0, !isEmpty(options.userToInvite), debouncedSearchValue);
        return {...options, headerMessage: header};
    }, [debouncedSearchValue, reports, personalDetails, betas, didScreenTransitionEnd]);

    const isOptionsDataReady = useMemo(() => ReportUtils.isReportDataReady() && OptionsListUtils.isPersonalDetailsReady(personalDetails), [personalDetails]);

    const sections = useMemo(() => {
        const newSections: Array<SectionListData<ReportUtils.OptionData, Section<ReportUtils.OptionData>>> = [];
        let indexOffset = 0;

        if (!didScreenTransitionEnd || !isOptionsDataReady) {
            return newSections;
        }
        if (recentReports.length > 0) {
            newSections.push({
                data: recentReports,
                shouldShow: true,
                indexOffset,
            });
            indexOffset += recentReports.length;
        }

        if (localPersonalDetails.length > 0) {
            newSections.push({
                data: localPersonalDetails,
                shouldShow: true,
                indexOffset,
            });
            indexOffset += recentReports.length;
        }

        if (userToInvite) {
            newSections.push({
                data: [userToInvite],
                shouldShow: true,
                indexOffset,
            });
        }

        return newSections;
    }, [didScreenTransitionEnd, isOptionsDataReady, localPersonalDetails, recentReports, userToInvite]);

    const selectReport = (option: ReportUtils.OptionData) => {
        if (!option) {
            return;
        }

        if (option.reportID) {
            setSearchValue('');
            Navigation.dismissModal(option.reportID);
        } else if (option.login) {
            Report.navigateToAndOpenReport([option.login]);
        }
    };

    const handleScreenTransitionEnd = () => {
        setDidScreenTransitionEnd(true);
    };

    const {inputCallbackRef} = useAutoFocusInput();

    return (
        <View>
            <SelectionList
                sections={sections}
                ListItem={UserListItem}
                textInputValue={searchValue}
                textInputLabel={translate('optionsSelector.nameEmailOrPhoneNumber')}
                textInputHint={offlineMessage}
                onChangeText={setSearchValue}
                headerMessage={headerMessage}
                // autoFocus
                onSelectRow={selectReport}
                showLoadingPlaceholder={!didScreenTransitionEnd || !isOptionsDataReady}
                isLoadingNewOptions={!!isSearchingForReports}
            />
        </View>
    );
}

ChatSearch.displayName = 'ChatSearch';

export default withOnyx<ChatSearchProps, ChatSearchWithOnyxProps>({
    reports: {
        key: ONYXKEYS.COLLECTION.REPORT,
    },
    betas: {
        key: ONYXKEYS.BETAS,
    },
    isSearchingForReports: {
        key: ONYXKEYS.IS_SEARCHING_FOR_REPORTS,
        initWithStoredValues: false,
    },
})(ChatSearch);
