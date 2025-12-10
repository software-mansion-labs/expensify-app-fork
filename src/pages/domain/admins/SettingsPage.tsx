import React from 'react';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import ScreenWrapper from '@components/ScreenWrapper';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {SettingsNavigatorParamList} from '@navigation/types';
import ToggleSettingOptionRow from '@pages/workspace/workflows/ToggleSettingsOptionRow';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

type DomainSettingsPageProps = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.DOMAIN.ADMINS_SETTINGS>;


function DomainSettingsPage({route}: DomainSettingsPageProps) {
    const styles = useThemeStyles();

    const [domainSettings] = useOnyx(`${ONYXKEYS.COLLECTION.SHARED_NVP_PRIVATE_DOMAIN_MEMBER}${route.params.accountID}`, {
        canBeMissing: false,
    });
    const currentlySelectedUser = domainSettings?.settings?.technicalContactEmail;

    return (
        <ScreenWrapper
            shouldEnableMaxHeight
            shouldUseCachedViewportHeight
            testID={DomainSettingsPage.displayName}
            enableEdgeToEdgeBottomSafeAreaPadding
        >
            <HeaderWithBackButton
                title="Settings"
                onBackButtonPress={() => {
                    Navigation.dismissModal();
                }}
            />
            <MenuItemWithTopDescription
                description="Primary contact"
                title={currentlySelectedUser}
                shouldShowRightIcon
                onPress={() => {
                    Navigation.navigate(ROUTES.DOMAIN_ADD_PRIMARY_CONTACT.getRoute(route.params.accountID));
                }}
            />
            <ToggleSettingOptionRow
                key="klucz+nowy"
                wrapperStyle={[styles.mv3, styles.ph5]}
                switchAccessibilityLabel="cfcf"
                isActive={false}
                onToggle={() => {}}
                subtitle="When enabled, the Primary Contact will be billed for all workspaces owned by expensify.com users and the billing receipt will be routed to the Primary Contact's account."
                title="Consolidated Domain Billing"
                shouldPlaceSubtitleBelowSwitch
            />
        </ScreenWrapper>
    );
}

DomainSettingsPage.displayName = 'WorkspaceInvitePage';

export default DomainSettingsPage;
