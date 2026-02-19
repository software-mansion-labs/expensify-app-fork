import {selectGroupByID} from '@selectors/Domain';
import React from 'react';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScrollView from '@components/ScrollView';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import ScreenWrapper from '@components/ScreenWrapper';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@navigation/Navigation';
import type {PlatformStackScreenProps} from '@navigation/PlatformStackNavigation/types';
import type {SettingsNavigatorParamList} from '@navigation/types';
import DomainNotFoundPageWrapper from '@pages/domain/DomainNotFoundPageWrapper';
import {closeUpdateDomainSecurityGroupNameError} from '@userActions/Domain';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import OfflineWithFeedback from '@components/OfflineWithFeedback';
import CONST from '@src/CONST';
import {View} from 'react-native';
import DefaultGroupToggle from './DefaultGroupToggle';
import DomainGroupPermissionsSection from './DomainGroupPermissionsSection';

type DomainGroupDetailsPageProps = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.DOMAIN.GROUP_DETAILS>;

function DomainGroupDetailsPage({route}: DomainGroupDetailsPageProps) {
    const {domainAccountID, groupID} = route.params;

    const styles = useThemeStyles();
    const {translate} = useLocalize();

    const [group] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${domainAccountID}`, {
        canBeMissing: true,
        selector: selectGroupByID(groupID),
    });

    const [domainPendingActions] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN_PENDING_ACTIONS}${domainAccountID}`, {canBeMissing: true});
    const [domainErrors] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN_ERRORS}${domainAccountID}`, {canBeMissing: true});

    return (
        <DomainNotFoundPageWrapper domainAccountID={domainAccountID}>
            <ScreenWrapper
                shouldEnableMaxHeight
                shouldShowOfflineIndicatorInWideScreen
                testID="DomainGroupDetailsPage"
            >
                <HeaderWithBackButton
                    title={group?.name ?? translate('domain.groups.title')}
                    onBackButtonPress={() => Navigation.goBack(ROUTES.DOMAIN_GROUPS.getRoute(domainAccountID))}
                />
                <ScrollView>
                    <OfflineWithFeedback
                        pendingAction={domainPendingActions?.[`${CONST.DOMAIN.DOMAIN_SECURITY_GROUP_PREFIX}${groupID}`]?.name}
                        errors={domainErrors?.[`${CONST.DOMAIN.DOMAIN_SECURITY_GROUP_PREFIX}${groupID}`]?.nameErrors}
                        errorRowStyles={styles.mh5}
                        onClose={() => closeUpdateDomainSecurityGroupNameError(domainAccountID, groupID)}
                    >
                        <MenuItemWithTopDescription
                            description={translate('common.name')}
                            title={group?.name ?? ''}
                            shouldShowRightIcon
                            onPress={() => Navigation.navigate(ROUTES.DOMAIN_GROUP_EDIT_NAME.getRoute(domainAccountID, groupID))}
                        />
                    </OfflineWithFeedback>
                    <DefaultGroupToggle
                        domainAccountID={domainAccountID}
                        groupID={groupID}
                        groupName={group?.name}
                    />
                    <View style={[styles.sectionDividerLine, styles.mh5, styles.mv6]} />
                    <DomainGroupPermissionsSection
                        domainAccountID={domainAccountID}
                        groupID={groupID}
                    />
                </ScrollView>
            </ScreenWrapper>
        </DomainNotFoundPageWrapper>
    );
}

export default DomainGroupDetailsPage;
