import React, {useCallback} from 'react';
import Button from '@components/Button';
import {Plus} from '@components/Icon/Expensicons';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import type {PlatformStackScreenProps} from '@navigation/PlatformStackNavigation/types';
import type {DomainSplitNavigatorParamList} from '@navigation/types';
import {selectMemberIDs} from '@src/libs/DomainUtils';
import ONYXKEYS from '@src/ONYXKEYS';
import type SCREENS from '@src/SCREENS';
import BaseDomainMembersPage, {type MemberOption} from '@pages/domain/BaseDomainMembersComponent';
import Navigation from '@navigation/Navigation';
import ROUTES from '@src/ROUTES';

type DomainMembersPageProps = PlatformStackScreenProps<DomainSplitNavigatorParamList, typeof SCREENS.DOMAIN.MEMBERS>;

function DomainMembersPage({route}: DomainMembersPageProps) {
    const domainID = route.params.accountID;
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {shouldUseNarrowLayout} = useResponsiveLayout();

    const [domain, fetchStatus] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${domainID}`, {canBeMissing: false});

    const [memberIDs] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${domainID}`, {
        canBeMissing: true,
        selector: selectMemberIDs,
    });

    const openMemberDetails = useCallback(
        (item: MemberOption) => {
            Navigation.setNavigationActionToMicrotaskQueue(() => {
                Navigation.navigate(ROUTES.DOMAIN_MEMBER_DETAILS.getRoute(domainID, item.accountID));
            });
        },
        [domainID],
    );

    const shouldShowLoading = fetchStatus.status !== 'loading' && !domain;

    const renderHeaderButtons = (
        <Button
            success
            onPress={() => {
                console.log("add member");
            }}
            text={translate('domain.members.addMember')}
            icon={Plus}
            innerStyles={[shouldUseNarrowLayout && styles.alignItemsCenter]}
            style={[shouldUseNarrowLayout && styles.flexGrow1, shouldUseNarrowLayout && styles.mb3]}
        />
    );

    return (
        <BaseDomainMembersPage
            domainID={domainID}
            domain={domain}
            accountIDs={memberIDs ?? []}
            headerTitle={translate('domain.members.title')}
            searchPlaceholder={translate('domain.members.findMember')}
            headerContent={renderHeaderButtons}
            onSelectRow={openMemberDetails}
            shouldShowLoading={shouldShowLoading}
        />
    );
}

DomainMembersPage.displayName = 'DomainMembersPage';

export default DomainMembersPage;
