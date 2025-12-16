import React, {useCallback} from 'react';
import type {WithNavigationTransitionEndProps} from '@components/withNavigationTransitionEnd';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import {selectAdminIDs} from '@libs/DomainUtils';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {SettingsNavigatorParamList} from '@navigation/types';
import {addAdminToDomain} from '@userActions/Domain';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import BaseDomainAddMemberComponent from '@pages/domain/BaseDomainAddMemberComponent';

type DomainAddAdminProps = WithNavigationTransitionEndProps & PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.DOMAIN.ADD_ADMIN>;

function DomainAddAdminPage({route}: DomainAddAdminProps) {
    const {translate} = useLocalize();
    const domainID = route.params.accountID;

    const [adminIDs] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${domainID}`, {
        canBeMissing: true,
        selector: selectAdminIDs,
    });

    const inviteAdmin = useCallback((accountID: number, login: string, domainName: string) => {
        addAdminToDomain(domainID, accountID, login, domainName);
    }, [domainID]);

    return (
        <BaseDomainAddMemberComponent
            domainID={domainID}
            headerTitle={translate('domain.admins.addAdmin')}
            submitButtonText={translate('domain.admins.invite')}
            onBackButtonPress={() => Navigation.goBack(ROUTES.DOMAIN_ADMINS.getRoute(domainID))}
            onInvite={inviteAdmin}
            excludeAccountIDs={adminIDs ?? []}
        />
    );
}

DomainAddAdminPage.displayName = 'DomainAddAdminPage';

export default DomainAddAdminPage;
