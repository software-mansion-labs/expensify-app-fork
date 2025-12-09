import {Str} from 'expensify-common';
import React, {useState} from 'react';
import {View} from 'react-native';
import Avatar from '@components/Avatar';
import Button from '@components/Button';
import ConfirmModal from '@components/ConfirmModal';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import OfflineWithFeedback from '@components/OfflineWithFeedback';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import {getDisplayNameOrDefault, getPhoneNumber} from '@libs/PersonalDetailsUtils';
import Navigation from '@navigation/Navigation';
import type {PlatformStackScreenProps} from '@navigation/PlatformStackNavigation/types';
import type {SettingsNavigatorParamList} from '@navigation/types';
import {getCurrentUserAccountID} from '@userActions/Report';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type SCREENS from '@src/SCREENS';
import type {PersonalDetails} from '@src/types/onyx';

type DomainAdminDetailsPageProps = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.DOMAIN.ADMIN_DETAILS>;

function DomainAdminDetailsPage({route}: DomainAdminDetailsPageProps) {
    const styles = useThemeStyles();
    const {translate, formatPhoneNumber} = useLocalize();

    const [isRevokingAdminAccess, setIsRevokingAdminAccess] = useState(false);

    const [personalDetails] = useOnyx(ONYXKEYS.PERSONAL_DETAILS_LIST, {canBeMissing: true});
    const icons = useMemoizedLazyExpensifyIcons(['RemoveMembers'] as const);

    const accountID = Number(route.params.accountID);
    const details = personalDetails?.[accountID] ?? ({} as PersonalDetails);
    const displayName = formatPhoneNumber(getDisplayNameOrDefault(details));
    const phoneNumber = getPhoneNumber(details);

    const currentUserAccountID = getCurrentUserAccountID();

    const memberLogin = personalDetails?.[accountID]?.login ?? '';
    const isSMSLogin = Str.isSMSLogin(memberLogin);

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
                        <Button
                            text={translate('domain.admins.revokeAdminAccess')}
                            onPress={() => setIsRevokingAdminAccess(true)}
                            isDisabled={accountID === currentUserAccountID}
                            icon={icons.RemoveMembers}
                            style={styles.mb5}
                        />
                        <View style={styles.w100}>
                            <MenuItemWithTopDescription
                                title={isSMSLogin ? formatPhoneNumber(phoneNumber ?? '') : memberLogin}
                                copyValue={isSMSLogin ? formatPhoneNumber(phoneNumber ?? '') : memberLogin}
                                description={translate(isSMSLogin ? 'common.phoneNumber' : 'common.email')}
                                interactive={false}
                                copyable
                            />
                        </View>
                        <ConfirmModal
                            danger
                            title={translate('domain.admins.revokeAdminAccess')}
                            isVisible={isRevokingAdminAccess}
                            onConfirm={() => {
                                setIsRevokingAdminAccess(false);
                                Navigation.dismissModal();
                            }}
                            onCancel={() => setIsRevokingAdminAccess(false)}
                            confirmText={translate('common.remove')}
                            cancelText={translate('common.cancel')}
                        />
                    </View>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}

DomainAdminDetailsPage.displayName = 'DomainAdminDetailsPage';

export default DomainAdminDetailsPage;
