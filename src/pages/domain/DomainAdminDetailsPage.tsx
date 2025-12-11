import {Str} from 'expensify-common';
import React, {useMemo, useState} from 'react';
import {View} from 'react-native';
import Avatar from '@components/Avatar';
import ConfirmModal from '@components/ConfirmModal';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import MenuItem from '@components/MenuItem';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import OfflineWithFeedback from '@components/OfflineWithFeedback';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import {getAdminKey, selectAdminIDs} from '@libs/DomainUtils';
import {getDisplayNameOrDefault, getPhoneNumber} from '@libs/PersonalDetailsUtils';
import Navigation from '@navigation/Navigation';
import type {PlatformStackScreenProps} from '@navigation/PlatformStackNavigation/types';
import type {SettingsNavigatorParamList} from '@navigation/types';
import {revokeAdminAccess} from '@userActions/Domain';
import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';
import ONYXKEYS from '@src/ONYXKEYS';
import type SCREENS from '@src/SCREENS';
import type {PersonalDetails} from '@src/types/onyx';

type BaseMenuItemType = {
    translationKey: TranslationPaths;
    action: () => Promise<void> | void;
};

type DomainAdminDetailsPageProps = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.DOMAIN.ADMIN_DETAILS>;

function DomainAdminDetailsPage({route}: DomainAdminDetailsPageProps) {
    const styles = useThemeStyles();
    const {translate, formatPhoneNumber} = useLocalize();

    const [domain] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${route.params.domainAccountID}`, {canBeMissing: true});
    const accountID = route.params.accountID;
    const adminKey = getAdminKey(domain, accountID) ?? '';
    const [adminIDs] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${route.params.domainAccountID}`, {
        canBeMissing: true,
        selector: selectAdminIDs,
    });
    const [isRevokingAdminAccess, setIsRevokingAdminAccess] = useState(false);

    const [personalDetails] = useOnyx(ONYXKEYS.PERSONAL_DETAILS_LIST, {canBeMissing: true});
    const icons = useMemoizedLazyExpensifyIcons(['RemoveMembers', 'ClosedSign'] as const);

    const details = personalDetails?.[accountID] ?? ({} as PersonalDetails);
    const displayName = formatPhoneNumber(getDisplayNameOrDefault(details));
    const phoneNumber = getPhoneNumber(details);

    const memberLogin = personalDetails?.[accountID]?.login ?? '';
    const isSMSLogin = Str.isSMSLogin(memberLogin);

    const menuItems = useMemo(() => {
        const baseMenuItems: BaseMenuItemType[] = [];

        if (!!adminIDs && adminIDs.length > 1) {
            baseMenuItems.push({
                translationKey: 'domain.admins.revokeAdminAccess',
                action: () => setIsRevokingAdminAccess(true),
            });
        } else {
            baseMenuItems.push({
                translationKey: 'domain.admins.resetDomain',
                action: () => setIsRevokingAdminAccess(true),
            });
        }

        return baseMenuItems.map((item) => ({
            key: item.translationKey,
            title: translate(item.translationKey),
            icon: icons.ClosedSign,
            onPress: item.action,
        }));
    }, [adminIDs, translate, icons.ClosedSign]);

    return (
        <ScreenWrapper
            enableEdgeToEdgeBottomSafeAreaPadding
            testID={DomainAdminDetailsPage.displayName}
        >
            <HeaderWithBackButton title={displayName} />
            <ScrollView addBottomSafeAreaPadding>
                <View style={[styles.containerWithSpaceBetween, styles.pointerEventsBoxNone, styles.justifyContentStart]}>
                    <View style={[styles.avatarSectionWrapper, styles.pb0]}>
                        <OfflineWithFeedback pendingAction={details.pendingFields?.avatar}>
                            <Avatar
                                containerStyles={[styles.avatarXLarge, styles.mb4, styles.noOutline]}
                                imageStyles={[styles.avatarXLarge]}
                                source={details.avatar}
                                avatarID={route.params.accountID}
                                type={CONST.ICON_TYPE_AVATAR}
                                size={CONST.AVATAR_SIZE.X_LARGE}
                            />
                        </OfflineWithFeedback>
                        {!!(details.displayName ?? '') && (
                            <Text
                                style={[styles.textHeadline, styles.pre, styles.mb8, styles.w100, styles.textAlignCenter]}
                                numberOfLines={1}
                            >
                                {displayName}
                            </Text>
                        )}
                    </View>
                </View>
                <MenuItemWithTopDescription
                    title={isSMSLogin ? formatPhoneNumber(phoneNumber ?? '') : memberLogin}
                    copyValue={isSMSLogin ? formatPhoneNumber(phoneNumber ?? '') : memberLogin}
                    description={translate(isSMSLogin ? 'common.phoneNumber' : 'common.email')}
                    interactive={false}
                    copyable
                />
                {menuItems.map((item) => (
                    <MenuItem
                        key={item.key}
                        icon={item.icon}
                        title={item.title}
                        onPress={item.onPress}
                    />
                ))}
                <ConfirmModal
                    danger
                    title={translate('domain.admins.revokeAdminAccess')}
                    isVisible={isRevokingAdminAccess}
                    onConfirm={() => {
                        revokeAdminAccess(route.params.domainAccountID, adminKey, route.params.accountID);
                        setIsRevokingAdminAccess(false);
                        Navigation.dismissModal();
                    }}
                    onCancel={() => setIsRevokingAdminAccess(false)}
                    confirmText={translate('common.remove')}
                    cancelText={translate('common.cancel')}
                />
            </ScrollView>
        </ScreenWrapper>
    );
}

DomainAdminDetailsPage.displayName = 'DomainAdminDetailsPage';

export default DomainAdminDetailsPage;
