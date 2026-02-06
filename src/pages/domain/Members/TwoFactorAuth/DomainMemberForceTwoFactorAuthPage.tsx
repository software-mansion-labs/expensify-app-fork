import {domainMemberSettingsSelector} from '@selectors/Domain';
import {personalDetailsSelector} from '@selectors/PersonalDetails';
import React from 'react';
import useOnyx from '@hooks/useOnyx';
import Navigation from '@navigation/Navigation';
import type {PlatformStackScreenProps} from '@navigation/PlatformStackNavigation/types';
import type {SettingsNavigatorParamList} from '@navigation/types';
import BaseDomainRequireTwoFactorAuthPage from '@pages/domain/BaseDomainRequireTwoFactorAuthPage';
import {setTwoFactorAuthExemptEmailForDomain} from '@userActions/Domain';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

type DomainMemberForceTwoFactorAuthPageProps = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.DOMAIN.MEMBER_FORCE_TWO_FACTOR_AUTH>;

function DomainMemberForceTwoFactorAuthPage({route}: DomainMemberForceTwoFactorAuthPageProps) {
    const {domainAccountID, accountID} = route.params;

    const [personalDetails] = useOnyx(ONYXKEYS.PERSONAL_DETAILS_LIST, {
        canBeMissing: true,
        selector: personalDetailsSelector(accountID),
    });
    const [domainSettings] = useOnyx(`${ONYXKEYS.COLLECTION.SHARED_NVP_PRIVATE_DOMAIN_MEMBER}${domainAccountID}`, {
        canBeMissing: false,
        selector: domainMemberSettingsSelector,
    });

    return (
        <BaseDomainRequireTwoFactorAuthPage
            domainAccountID={domainAccountID}
            onSubmit={(code: string) => {
                if (!personalDetails?.login) {
                    return;
                }

                setTwoFactorAuthExemptEmailForDomain(domainAccountID, accountID, domainSettings?.twoFactorAuthExemptEmails ?? [], personalDetails.login, false, code);
                Navigation.goBack(ROUTES.DOMAIN_MEMBER_DETAILS.getRoute(domainAccountID, accountID));
            }}
            onBackButtonPress={() => {
                Navigation.goBack(ROUTES.DOMAIN_MEMBER_DETAILS.getRoute(domainAccountID, accountID));
            }}
        />
    );
}

DomainMemberForceTwoFactorAuthPage.displayName = 'DomainMemberForceTwoFactorAuthPage';

export default DomainMemberForceTwoFactorAuthPage;
