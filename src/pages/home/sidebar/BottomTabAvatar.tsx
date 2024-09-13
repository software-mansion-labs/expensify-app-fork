import {useRoute} from '@react-navigation/native';
import React, {useCallback} from 'react';
import {useOnyx} from 'react-native-onyx';
import {PressableWithFeedback} from '@components/Pressable';
import Tooltip from '@components/Tooltip';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useLocalize from '@hooks/useLocalize';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import interceptAnonymousUser from '@libs/interceptAnonymousUser';
import Navigation from '@libs/Navigation/Navigation';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import SCREENS from '@src/SCREENS';
import AvatarWithDelegateAvatar from './AvatarWithDelegateAvatar';
import AvatarWithOptionalStatus from './AvatarWithOptionalStatus';
import ProfileAvatarWithIndicator from './ProfileAvatarWithIndicator';

type BottomTabAvatarProps = {
    /** Whether the create menu is open or not */
    isCreateMenuOpen?: boolean;

    /** Whether the avatar is selected */
    isSelected?: boolean;
};

function BottomTabAvatar({isCreateMenuOpen = false, isSelected = false}: BottomTabAvatarProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const [account] = useOnyx(ONYXKEYS.ACCOUNT);
    const delegateEmail = account?.delegatedAccess?.delegate ?? '';
    const route = useRoute();
    const currentUserPersonalDetails = useCurrentUserPersonalDetails();
    const emojiStatus = currentUserPersonalDetails?.status?.emojiCode ?? '';
    const {shouldUseNarrowLayout} = useResponsiveLayout();

    const showSettingsPage = useCallback(() => {
        if (isCreateMenuOpen) {
            // Prevent opening Settings page when click profile avatar quickly after clicking FAB icon
            return;
        }

        if (([SCREENS.SETTINGS.WORKSPACES, SCREENS.WORKSPACE.INITIAL] as string[]).includes(route.name) && shouldUseNarrowLayout) {
            Navigation.goBack(ROUTES.SETTINGS);
            return;
        }

        interceptAnonymousUser(() => Navigation.navigate(ROUTES.SETTINGS));
    }, [isCreateMenuOpen, shouldUseNarrowLayout, route.name]);

    let children;

    if (delegateEmail) {
        children = (
            <AvatarWithDelegateAvatar
                delegateEmail={delegateEmail}
                isSelected={isSelected}
            />
        );
    } else if (emojiStatus) {
        children = (
            <AvatarWithOptionalStatus
                emojiStatus={emojiStatus}
                isSelected={isSelected}
            />
        );
    } else {
        children = <ProfileAvatarWithIndicator isSelected={isSelected} />;
    }

    return (
        <Tooltip text={translate('initialSettingsPage.accountSettings')}>
            <PressableWithFeedback
                onPress={showSettingsPage}
                role={CONST.ROLE.BUTTON}
                accessibilityLabel={translate('sidebarScreen.buttonMySettings')}
                wrapperStyle={styles.flex1}
                style={styles.bottomTabBarItem}
            >
                {children}
            </PressableWithFeedback>
        </Tooltip>
    );
}

BottomTabAvatar.displayName = 'BottomTabAvatar';
export default BottomTabAvatar;
