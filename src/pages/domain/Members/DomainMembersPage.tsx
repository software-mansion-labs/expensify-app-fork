import {defaultSecurityGroupIDSelector, groupsSelector, memberAccountIDsSelector, memberPendingActionSelector} from '@selectors/Domain';
import React, {useMemo, useState} from 'react';
import {View} from 'react-native';
import Button from '@components/Button';
import type {PopoverComponentProps} from '@components/Search/FilterDropdowns/DropdownButton';
import DropdownButton from '@components/Search/FilterDropdowns/DropdownButton';
import type {SingleSelectItem} from '@components/Search/FilterDropdowns/SingleSelectPopup';
import SingleSelectPopup from '@components/Search/FilterDropdowns/SingleSelectPopup';
import Text from '@components/Text';
import {useMemoizedLazyExpensifyIcons, useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import {clearDomainMemberError} from '@libs/actions/Domain';
import {getLatestError} from '@libs/ErrorUtils';
import Navigation from '@navigation/Navigation';
import type {PlatformStackScreenProps} from '@navigation/PlatformStackNavigation/types';
import type {DomainSplitNavigatorParamList} from '@navigation/types';
import BaseDomainMembersPage from '@pages/domain/BaseDomainMembersPage';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

type DomainMembersPageProps = PlatformStackScreenProps<DomainSplitNavigatorParamList, typeof SCREENS.DOMAIN.MEMBERS>;

function DomainMembersPage({route}: DomainMembersPageProps) {
    const {domainAccountID} = route.params;
    const {translate} = useLocalize();
    const illustrations = useMemoizedLazyIllustrations(['Profile']);
    const icons = useMemoizedLazyExpensifyIcons(['Plus']);
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const styles = useThemeStyles();

    const [domainErrors] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN_ERRORS}${domainAccountID}`, {canBeMissing: true});
    const [domainPendingActions] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN_PENDING_ACTIONS}${domainAccountID}`, {canBeMissing: true, selector: memberPendingActionSelector});
    const [defaultSecurityGroupID] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${domainAccountID}`, {canBeMissing: true, selector: defaultSecurityGroupIDSelector});

    const [memberIDs] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${domainAccountID}`, {
        canBeMissing: true,
        selector: memberAccountIDsSelector,
    });

    const [groups] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${domainAccountID}`, {
        canBeMissing: true,
        selector: groupsSelector,
    });

    const ALL_MEMBERS_VALUE = 'all';

    const [selectedGroup, setSelectedGroup] = useState<SingleSelectItem<string> | null>(null);

    const allMembersLabel = translate('domain.members.allMembers');

    const groupOptions = useMemo<Array<SingleSelectItem<string>>>(
        () => [{text: allMembersLabel, value: ALL_MEMBERS_VALUE}, ...(groups ?? []).map((group) => ({text: group.details.name ?? '', value: group.id}))],
        [groups, allMembersLabel],
    );

    const filteredMemberIDs = useMemo(() => {
        if (!selectedGroup || selectedGroup.value === ALL_MEMBERS_VALUE || !groups) {
            return memberIDs ?? [];
        }
        const group = groups.find((g) => g.id === selectedGroup.value);
        if (!group) {
            return memberIDs ?? [];
        }
        return Object.keys(group.details.shared)
            .map(Number)
            .filter((id) => !Number.isNaN(id));
    }, [selectedGroup, groups, memberIDs]);

    const handleGroupChange = (item: SingleSelectItem<string> | null) => {
        if (!item || item.value === ALL_MEMBERS_VALUE) {
            setSelectedGroup(null);
        } else {
            setSelectedGroup(item);
        }
    };

    const dropdownLabel = selectedGroup?.text ?? allMembersLabel;

    const groupPopoverComponent = ({closeOverlay}: PopoverComponentProps) => (
        <SingleSelectPopup
            label={translate('common.group')}
            items={groupOptions}
            value={selectedGroup ?? {text: allMembersLabel, value: ALL_MEMBERS_VALUE}}
            closeOverlay={closeOverlay}
            onChange={handleGroupChange}
            defaultValue={ALL_MEMBERS_VALUE}
            selectionListStyle={{listItemWrapperStyle: {minHeight: 40}}}
        />
    );

    const groupFilterDropdown =
        groupOptions.length > 1 ? (
            <DropdownButton
                label={dropdownLabel}
                value={null}
                PopoverComponent={groupPopoverComponent}
                innerStyles={[styles.gap2, shouldUseNarrowLayout && styles.mw100]}
                wrapperStyle={shouldUseNarrowLayout && styles.w100}
                labelStyle={styles.fontSizeLabel}
                caretWrapperStyle={styles.gap2}
                medium
            />
        ) : null;

    const getGroupRightElement = (accountID: number) => {
        if (!groups) {
            return undefined;
        }
        const group = groups.find((g) => String(accountID) in g.details.shared);
        return <Text style={styles.flex1}>{group?.details.name ?? '-'}</Text>;
    };

    const getCustomListHeader = () => {
        return (
            <View style={[styles.ph9, styles.pv3, styles.flex1, styles.flexRow, styles.justifyContentBetween]}>
                <Text style={[styles.textMicroSupporting, styles.flex1, styles.pr8]}>{translate('domain.members.title')}</Text>
                <Text style={[styles.textMicroSupporting, styles.flex1]}>{translate('common.group')}</Text>
            </View>
        );
    };

    const renderHeaderButtons = (
        <Button
            success
            onPress={() => Navigation.navigate(ROUTES.DOMAIN_ADD_MEMBER.getRoute(domainAccountID))}
            text={translate('domain.members.addMember')}
            icon={icons.Plus}
            innerStyles={[shouldUseNarrowLayout && styles.alignItemsCenter]}
            style={shouldUseNarrowLayout ? [styles.flexGrow1, styles.mb3] : undefined}
        />
    );

    const getCustomRowProps = (accountID: number, email?: string) => {
        const emailError = email ? getLatestError(domainErrors?.memberErrors?.[email]?.errors) : undefined;
        const accountIDError = getLatestError(domainErrors?.memberErrors?.[accountID]?.errors);
        const emailPendingAction = email ? domainPendingActions?.[email]?.pendingAction : undefined;
        const accountIDPendingAction = domainPendingActions?.[accountID]?.pendingAction;

        return {errors: emailError ?? accountIDError, pendingAction: emailPendingAction ?? accountIDPendingAction};
    };

    return (
        <BaseDomainMembersPage
            domainAccountID={domainAccountID}
            accountIDs={filteredMemberIDs}
            headerTitle={translate('domain.members.title')}
            getCustomListHeader={getCustomListHeader}
            searchPlaceholder={translate('domain.members.findMember')}
            onSelectRow={(item) => Navigation.navigate(ROUTES.DOMAIN_MEMBER_DETAILS.getRoute(domainAccountID, item.accountID))}
            headerIcon={illustrations.Profile}
            getCustomRowProps={getCustomRowProps}
            getCustomRightElement={getGroupRightElement}
            headerContent={renderHeaderButtons}
            searchBarAccessory={groupFilterDropdown}
            onDismissError={(item) => {
                if (!defaultSecurityGroupID) {
                    return;
                }
                clearDomainMemberError(domainAccountID, item.accountID, item.login, defaultSecurityGroupID, item.pendingAction);
            }}
        />
    );
}

export default DomainMembersPage;
