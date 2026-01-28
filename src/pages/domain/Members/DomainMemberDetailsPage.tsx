import {domainMemberSettingsSelector} from '@selectors/Domain';
import React from 'react';
import type {OnyxEntry} from 'react-native-onyx';
import MenuItem from '@components/MenuItem';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import {getLatestError} from '@libs/ErrorUtils';
import Navigation from '@navigation/Navigation';
import type {PlatformStackScreenProps} from '@navigation/PlatformStackNavigation/types';
import type {SettingsNavigatorParamList} from '@navigation/types';
import BaseDomainMemberDetailsComponent from '@pages/domain/BaseDomainMemberDetailsComponent';
import ToggleSettingOptionRow from '@pages/workspace/workflows/ToggleSettingsOptionRow';
import {clearTwoFactorAuthExemptEmailsErrors, setTwoFactorAuthExemptEmailForDomain} from '@userActions/Domain';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import type {PersonalDetailsList} from '@src/types/onyx';

type DomainMemberDetailsPageProps = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.DOMAIN.MEMBER_DETAILS>;

function DomainMemberDetailsPage({route}: DomainMemberDetailsPageProps) {
    const {domainAccountID, accountID} = route.params;

    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const icons = useMemoizedLazyExpensifyIcons(['Flag']);

    // The selector depends on the dynamic `accountID`, so it cannot be extracted
    // to a static function outside the component.
    // eslint-disable-next-line rulesdir/no-inline-useOnyx-selector
    const [personalDetails] = useOnyx(ONYXKEYS.PERSONAL_DETAILS_LIST, {
        canBeMissing: true,
        selector: (personalDetailsList: OnyxEntry<PersonalDetailsList>) => personalDetailsList?.[accountID],
    });

    const [domainPendingActions] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN_PENDING_ACTIONS}${domainAccountID}`, {
        canBeMissing: true,
    });
    const [domainErrors] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN_ERRORS}${domainAccountID}`, {
        canBeMissing: true,
    });
    const [domainSettings] = useOnyx(`${ONYXKEYS.COLLECTION.SHARED_NVP_PRIVATE_DOMAIN_MEMBER}${domainAccountID}`, {
        canBeMissing: false,
        selector: domainMemberSettingsSelector,
    });
    const [account] = useOnyx(ONYXKEYS.ACCOUNT);
    const is2FAEnabled = account?.requiresTwoFactorAuth;

    const memberLogin = personalDetails?.login ?? '';

    return (
        <BaseDomainMemberDetailsComponent
            domainAccountID={domainAccountID}
            accountID={accountID}
        >
            <ToggleSettingOptionRow
                wrapperStyle={[styles.mv3, styles.ph5]}
                switchAccessibilityLabel={translate('domain.common.forceTwoFactorAuth')}
                isActive={!!domainSettings?.twoFactorAuthExemptEmails?.includes(memberLogin)}
                onToggle={(value) => {
                    if (!personalDetails?.login) {
                        return;
                    }

                    if (!value && is2FAEnabled) {
                        Navigation.navigate(ROUTES.DOMAIN_MEMBER_TWO_FACTOR_AUTH.getRoute(domainAccountID, accountID));
                    } else {
                        setTwoFactorAuthExemptEmailForDomain(domainAccountID, accountID, domainSettings?.twoFactorAuthExemptEmails ?? [], personalDetails.login, value);
                    }
                }}
                title={translate('domain.common.forceTwoFactorAuth')}
                pendingAction={domainPendingActions?.member?.[accountID]?.twoFactorAuthExemptEmails}
                errors={getLatestError(domainErrors?.memberErrors?.[accountID]?.twoFactorAuthExemptEmailsError)}
                onCloseError={() => clearTwoFactorAuthExemptEmailsErrors(domainAccountID, accountID)}
            />

            {!!account?.requiresTwoFactorAuth && (
                <MenuItem
                    style={styles.mb5}
                    title={translate('domain.common.resetTwoFactorAuth')}
                    icon={icons.Flag}
                    onPress={() => Navigation.navigate(ROUTES.DOMAIN_MEMBER_TWO_FACTOR_AUTH.getRoute(domainAccountID, accountID))}
                />
            )}
        </BaseDomainMemberDetailsComponent>
    );
}

DomainMemberDetailsPage.displayName = 'DomainMemberDetailsPage';

export default DomainMemberDetailsPage;
