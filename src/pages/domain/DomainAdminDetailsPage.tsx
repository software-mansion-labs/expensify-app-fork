import React, {useMemo, useState} from 'react';
import ConfirmModal from '@components/ConfirmModal';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import {getAdminKey, selectAdminIDs} from '@libs/DomainUtils';
import Navigation from '@navigation/Navigation';
import type {PlatformStackScreenProps} from '@navigation/PlatformStackNavigation/types';
import type {SettingsNavigatorParamList} from '@navigation/types';
import {revokeAdminAccess} from '@userActions/Domain';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import BaseDomainMemberDetailsComponent from './BaseDomainMemberDetailsComponent';
import type {MemberDetailsMenuItem} from './BaseDomainMemberDetailsComponent';

type DomainAdminDetailsPageProps = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.DOMAIN.ADMIN_DETAILS>;

function DomainAdminDetailsPage({route}: DomainAdminDetailsPageProps) {
    const {translate} = useLocalize();

    const domainID = route.params.domainAccountID;
    const accountID = route.params.accountID;

    // Logika biznesowa specyficzna dla Admina
    const [domain] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${domainID}`, {canBeMissing: true});
    const [adminIDs] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${domainID}`, {
        canBeMissing: true,
        selector: selectAdminIDs,
    });
    const adminKey = getAdminKey(domain, accountID) ?? '';

    const [isRevokingAdminAccess, setIsRevokingAdminAccess] = useState(false);
    const icons = useMemoizedLazyExpensifyIcons(['ClosedSign'] as const);

    const menuItems = useMemo(() => {
        const baseMenuItems: MemberDetailsMenuItem[] = [];

        if (!!adminIDs && adminIDs.length > 1) {
            baseMenuItems.push({
                key: 'revokeAdminAccess',
                title: translate('domain.admins.revokeAdminAccess'),
                icon: icons.ClosedSign,
                onPress: () => setIsRevokingAdminAccess(true),
            });
        } else {
            baseMenuItems.push({
                key: 'resetDomain',
                title: translate('domain.admins.resetDomain'),
                icon: icons.ClosedSign,
                onPress: () => Navigation.navigate(ROUTES.DOMAIN_RESET_DOMAIN.getRoute(domainID, accountID)),
            });
        }

        return baseMenuItems;
    }, [adminIDs, translate, icons.ClosedSign, domainID, accountID]);

    const confirmRevokeAccess = () => {
        revokeAdminAccess(domainID, adminKey, accountID);
        setIsRevokingAdminAccess(false);
        Navigation.dismissModal();
    };

    return (
        <BaseDomainMemberDetailsComponent
            accountID={accountID}
            menuItems={menuItems}
        >
            <ConfirmModal
                danger
                title={translate('domain.admins.revokeAdminAccess')}
                isVisible={isRevokingAdminAccess}
                onConfirm={confirmRevokeAccess}
                onCancel={() => setIsRevokingAdminAccess(false)}
                confirmText={translate('common.remove')}
                cancelText={translate('common.cancel')}
            />
        </BaseDomainMemberDetailsComponent>
    );
}

DomainAdminDetailsPage.displayName = 'DomainAdminDetailsPage';

export default DomainAdminDetailsPage;
