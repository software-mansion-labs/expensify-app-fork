import React, { useCallback } from 'react';
import Button from '@components/Button';
import { Gear, Plus } from '@components/Icon/Expensicons';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@navigation/Navigation';
import type { PlatformStackScreenProps } from '@navigation/PlatformStackNavigation/types';
import type { DomainSplitNavigatorParamList } from '@navigation/types';
import { getCurrentUserAccountID } from '@userActions/Report';
import { selectAdminIDs } from '@src/libs/DomainUtils';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import type {MemberOption} from './BaseDomainMembersComponent';
import BaseDomainMembersPage from './BaseDomainMembersComponent';

type DomainAdminsPageProps = PlatformStackScreenProps<DomainSplitNavigatorParamList, typeof SCREENS.DOMAIN.SAML>;

function DomainAdminsPage({route}: DomainAdminsPageProps) {
    const domainID = route.params.accountID;
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const currentUserAccountID = getCurrentUserAccountID();

    const [domain] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${domainID}`, {canBeMissing: false});

    const [adminIDs] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${domainID}`, {
        canBeMissing: true,
        selector: selectAdminIDs,
    });

    const isAdmin = adminIDs?.includes(currentUserAccountID) ?? false;

    const openMemberDetails = useCallback(
        (item: MemberOption) => {
            Navigation.setNavigationActionToMicrotaskQueue(() => {
                Navigation.navigate(ROUTES.DOMAIN_ADMIN_DETAILS.getRoute(domainID, item.accountID));
            });
        },
        [domainID],
    );

    const renderHeaderButtons = isAdmin ? (
        <>
            <Button
                success
                onPress={() => {
                    Navigation.navigate(ROUTES.DOMAIN_ADD_ADMIN.getRoute(domainID));
                }}
                text={translate('domain.admins.addAdmin')}
                icon={Plus}
                innerStyles={[shouldUseNarrowLayout && styles.alignItemsCenter]}
                style={[shouldUseNarrowLayout && styles.flexGrow1, shouldUseNarrowLayout && styles.mb3]}
            />
            <Button
                onPress={() => {
                    Navigation.navigate(ROUTES.DOMAIN_ADMINS_SETTINGS.getRoute(domainID));
                }}
                text={translate('domain.admins.settings')}
                icon={Gear}
                innerStyles={[shouldUseNarrowLayout && styles.alignItemsCenter]}
                style={[shouldUseNarrowLayout && styles.flexGrow1, shouldUseNarrowLayout && styles.mb3]}
            />
        </>
    ) : null;

    return (
        <BaseDomainMembersPage
            domainID={domainID}
            domain={domain}
            accountIDs={adminIDs ?? []}
            headerTitle={translate('domain.admins.title')}
            searchPlaceholder={translate('domain.admins.findAdmin')}
            headerContent={renderHeaderButtons}
            onSelectRow={openMemberDetails}
            shouldShowLoading={false}
        />
    );
}

DomainAdminsPage.displayName = 'DomainAdminsPage';

export default DomainAdminsPage;
