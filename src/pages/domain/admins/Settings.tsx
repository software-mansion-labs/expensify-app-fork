import React from 'react';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import ScreenWrapper from '@components/ScreenWrapper';
import type {WithNavigationTransitionEndProps} from '@components/withNavigationTransitionEnd';
import useThemeStyles from '@hooks/useThemeStyles';
import {clearErrors} from '@libs/actions/Policy/Policy';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {SettingsNavigatorParamList} from '@navigation/types';
import type {WithPolicyAndFullscreenLoadingProps} from '@pages/workspace/withPolicyAndFullscreenLoading';
import ToggleSettingOptionRow from '@pages/workspace/workflows/ToggleSettingsOptionRow';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

type WorkspaceInvitePageProps = WithPolicyAndFullscreenLoadingProps &
    WithNavigationTransitionEndProps &
    PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.INVITE>;

function DomainAddAdminPage({route}: WorkspaceInvitePageProps) {
    const styles = useThemeStyles();
    return (
        <ScreenWrapper
            shouldEnableMaxHeight
            shouldUseCachedViewportHeight
            testID={DomainAddAdminPage.displayName}
            enableEdgeToEdgeBottomSafeAreaPadding
        >
            <HeaderWithBackButton
                title="Settings"
                onBackButtonPress={() => {
                    clearErrors(route.params.policyID);
                    Navigation.dismissModal();
                }}
            />
            <MenuItemWithTopDescription
                title="Primary contact"
                shouldShowRightIcon
                onPress={() => {
                    Navigation.navigate(ROUTES.DOMAIN_ADD_PRIMARY_CONTACT.getRoute(1));
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

DomainAddAdminPage.displayName = 'WorkspaceInvitePage';

export default DomainAddAdminPage;
