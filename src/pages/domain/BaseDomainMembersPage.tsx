import React from 'react';
import {View} from 'react-native';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import SearchBar from '@components/SearchBar';
// eslint-disable-next-line no-restricted-imports
import SelectionList from '@components/SelectionList';
import TableListItem from '@components/SelectionList/ListItem/TableListItem';
import type {ListItem} from '@components/SelectionList/types';
import CustomListHeader from '@components/SelectionListWithModal/CustomListHeader';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
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
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {GeneralDomainMemberErrors} from '@src/types/onyx/DomainErrors';
import type {GeneralDomainMemberPendingAction} from '@src/types/onyx/DomainPendingActions';
import {isEmptyObject} from '@src/types/utils/EmptyObject';
import type IconAsset from '@src/types/utils/IconAsset';
import DomainNotFoundPageWrapper from './DomainNotFoundPageWrapper';

type MemberOption = Omit<ListItem, 'accountID' | 'login'> & {
    /** Member accountID */
    accountID: number;
    /** Member login */
    login: string;
};

type BaseDomainMembersPageProps = {
    /** The ID of the domain used for the not found wrapper */
    domainAccountID: number;

    /** The list of accountIDs to display */
    accountIDs: number[];

    /** The title of the header */
    headerTitle: string;

    /** Placeholder text for the search bar */
    searchPlaceholder: string;

    /** Content to display in the header (e.g., Add/Settings buttons) */
    headerContent?: React.ReactNode;

    /** Callback fired when a row is selected */
    onSelectRow: (item: MemberOption) => void;

    /** Icon displayed in the header of the tab */
    headerIcon?: IconAsset;

    /** Function to render a custom right element for a row */
    getCustomRightElement?: (accountID: number) => React.ReactNode;

    /** Errors for each member, keyed by accountID or email */
    memberErrors?: Record<string | number, GeneralDomainMemberErrors>;

    /** Pending actions for each member, keyed by accountID or email */
    memberPendingActions?: Record<string | number, GeneralDomainMemberPendingAction>;

    /** Callback fired when the user dismisses an error message for a specific row */
    onDismissError?: (item: MemberOption) => void;
};

function BaseDomainMembersPage({
    domainAccountID,
    accountIDs,
    headerTitle,
    searchPlaceholder,
    headerContent,
    onSelectRow,
    headerIcon,
    getCustomRightElement,
    memberErrors,
    memberPendingActions,
    onDismissError,
}: BaseDomainMembersPageProps) {
    const {formatPhoneNumber, localeCompare} = useLocalize();
    const styles = useThemeStyles();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const [personalDetails] = useOnyx(ONYXKEYS.PERSONAL_DETAILS_LIST, {canBeMissing: true});
    const icons = useMemoizedLazyExpensifyIcons(['FallbackAvatar']);

    const data: MemberOption[] = accountIDs.map((accountID) => {
        const details = personalDetails?.[accountID];
        const login = details?.login ?? '';

        const emailErrors = login ? memberErrors?.[login] : undefined;
        const accountIDErrors = memberErrors?.[accountID];
        const mergedErrors: GeneralDomainMemberErrors = {
            errors: {...accountIDErrors?.errors, ...emailErrors?.errors},
            twoFactorAuthExemptEmailsError: {...accountIDErrors?.twoFactorAuthExemptEmailsError, ...emailErrors?.twoFactorAuthExemptEmailsError},
        };

        const emailPendingAction = login ? memberPendingActions?.[login] : undefined;
        const accountIDPendingAction = memberPendingActions?.[accountID];
        const pendingAction = emailPendingAction?.pendingAction ?? accountIDPendingAction?.pendingAction;
        const isPendingActionDelete = pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE;

        return {
            keyForList: String(accountID),
            accountID,
            login,
            text: formatPhoneNumber(getDisplayNameOrDefault(details)),
            alternateText: formatPhoneNumber(login),
            icons: [
                {
                    source: details?.avatar ?? icons.FallbackAvatar,
                    name: formatPhoneNumber(login),
                    type: CONST.ICON_TYPE_AVATAR,
                    id: accountID,
                },
            ],
            rightElement: getCustomRightElement?.(accountID),
            errors: getLatestError(mergedErrors.errors),
            pendingAction,
            isInteractive: !isPendingActionDelete && !details?.isOptimisticPersonalDetail,
            isDisabled: isPendingActionDelete,
            brickRoadIndicator: !isEmptyObject(mergedErrors.twoFactorAuthExemptEmailsError) ? CONST.BRICK_ROAD_INDICATOR_STATUS.ERROR : undefined,
        };
    });

    const filterMember = (memberOption: MemberOption, searchQuery: string) => {
        const results = tokenizedSearch([memberOption], searchQuery, (option) => [option.text ?? '', option.alternateText ?? '']);
        return results.length > 0;
    };

    const sortMembers = (options: MemberOption[]) => sortAlphabetically(options, 'text', localeCompare);

    const [inputValue, setInputValue, filteredData] = useSearchResults(data, filterMember, sortMembers);

    const getCustomListHeader = () => {
        if (filteredData.length === 0) {
            return null;
        }
        return (
            <CustomListHeader
                canSelectMultiple={false}
                leftHeaderText={headerTitle}
            />
        );
    };

    const listHeaderContent =
        data.length > CONST.SEARCH_ITEM_LIMIT ? (
            <SearchBar
                inputValue={inputValue}
                onChangeText={setInputValue}
                label={searchPlaceholder}
                shouldShowEmptyState={!filteredData.length}
            />
        ) : null;

    return (
        <DomainNotFoundPageWrapper domainAccountID={domainAccountID}>
            <ScreenWrapper
                enableEdgeToEdgeBottomSafeAreaPadding
                shouldEnableMaxHeight
                shouldShowOfflineIndicatorInWideScreen
                testID={BaseDomainMembersPage.displayName}
            >
                <HeaderWithBackButton
                    title={headerTitle}
                    onBackButtonPress={Navigation.popToSidebar}
                    icon={headerIcon}
                    shouldShowBackButton={shouldUseNarrowLayout}
                >
                    {!shouldUseNarrowLayout && !!headerContent && <View style={[styles.flexRow, styles.gap2]}>{headerContent}</View>}
                </HeaderWithBackButton>

                {shouldUseNarrowLayout && !!headerContent && <View style={[styles.pl5, styles.pr5, styles.flexRow, styles.gap2]}>{headerContent}</View>}

                <SelectionList
                    data={filteredData}
                    shouldShowRightCaret
                    canSelectMultiple={false}
                    style={{
                        containerStyle: styles.flex1,
                        listHeaderWrapperStyle: [styles.ph9, styles.pv3, styles.pb5],
                        listItemTitleContainerStyles: shouldUseNarrowLayout ? undefined : styles.pr3,
                    }}
                    ListItem={TableListItem}
                    onSelectRow={onSelectRow}
                    onDismissError={onDismissError}
                    showListEmptyContent={false}
                    showScrollIndicator={false}
                    addBottomSafeAreaPadding
                    shouldHeaderBeInsideList
                    customListHeader={getCustomListHeader()}
                    customListHeaderContent={listHeaderContent}
                    disableMaintainingScrollPosition
                />
            </ScreenWrapper>
        </DomainNotFoundPageWrapper>
    );
}

BaseDomainMembersPage.displayName = 'BaseDomainMembersPage';
export type {MemberOption};
export default BaseDomainMembersPage;
