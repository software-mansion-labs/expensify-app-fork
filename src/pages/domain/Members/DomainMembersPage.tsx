import {defaultSecurityGroupIDSelector, memberAccountIDsSelector} from '@selectors/Domain';
import React from 'react';
import Button from '@components/Button';
import {useMemoizedLazyExpensifyIcons, useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import  {memberAccountIDsSelector} from '@selectors/Domain';
import React, {useState} from 'react';
import ButtonWithDropdownMenu from '@components/ButtonWithDropdownMenu';
import {useMemoizedLazyExpensifyIcons, useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import {clearAddMemberError} from '@libs/actions/Domain';
import {getLatestError} from '@libs/ErrorUtils';
import Navigation from '@navigation/Navigation';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@navigation/Navigation';
import type {PlatformStackScreenProps} from '@navigation/PlatformStackNavigation/types';
import type {DomainSplitNavigatorParamList} from '@navigation/types';
import BaseDomainMembersPage from '@pages/domain/BaseDomainMembersPage';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import {close} from '@userActions/Modal';
import {downloadMembersCSV} from '@userActions/Policy/Member';
import CONST from '@src/CONST';
import useNetwork from '@hooks/useNetwork';
import ConfirmModal from '@components/ConfirmModal';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';
import enhanceParameters from '@libs/Network/enhanceParameters';
import {WRITE_COMMANDS} from '@libs/API/types';
import fileDownload from '@libs/fileDownload';
import * as ApiUtils from '@libs/ApiUtils';

type DomainMembersPageProps = PlatformStackScreenProps<DomainSplitNavigatorParamList, typeof SCREENS.DOMAIN.MEMBERS>;

function DomainMembersPage({route}: DomainMembersPageProps) {
    const {domainAccountID} = route.params;
    const {translate} = useLocalize();
    const illustrations = useMemoizedLazyIllustrations(['Profile']);
    const icons = useMemoizedLazyExpensifyIcons(['Gear','Download']);
    const styles = useThemeStyles();
    const {isOffline} = useNetwork();
    const [isOfflineModalVisible, setIsOfflineModalVisible] = useState(false);
    const icons = useMemoizedLazyExpensifyIcons(['Plus']);
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const styles = useThemeStyles();

    const [domainErrors] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN_ERRORS}${domainAccountID}`, {canBeMissing: true});
    const [domainPendingActions] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN_PENDING_ACTIONS}${domainAccountID}`, {canBeMissing: true});
    const [defaultSecurityGroupID] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${domainAccountID}`, {canBeMissing: true, selector: defaultSecurityGroupIDSelector});

    const [memberIDs] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${domainAccountID}`, {
        canBeMissing: true,
        selector: memberAccountIDsSelector,
    });

    const headerContent = (
        <>
            <Button
                success
                onPress={() => Navigation.navigate(ROUTES.DOMAIN_ADD_MEMBER.getRoute(domainAccountID))}
                text={translate('domain.members.addMember')}
                icon={icons.Plus}
                innerStyles={[shouldUseNarrowLayout && styles.alignItemsCenter]}
                style={shouldUseNarrowLayout ? [styles.flexGrow1, styles.mb3] : undefined}
            />
            <ButtonWithDropdownMenu
                success={false}
                onPress={() => {}}
                shouldAlwaysShowDropdownMenu
                customText={translate('common.more')}
                options={[
                    {
                        text: translate('domain.admins.settings'),
                        icon: icons.Gear,
                        onSelected: () => Navigation.navigate(ROUTES.DOMAIN_MEMBERS_SETTINGS.getRoute(domainAccountID)),
                        value: CONST.DOMAIN.SECONDARY_ACTIONS.LEAVE,
                    },
                    {
                        text: translate('spreadsheet.downloadCSV'),
                        icon: icons.Download,
                        onSelected: () => {
                                if (isOffline) {
                                    close(() => setIsOfflineModalVisible(true));
                                    return;
                                }

                                close(() => {
                                    // API call responsible for downloading members as a CSV file
                                });
                        },
                        value: CONST.DOMAIN.SECONDARY_ACTIONS.SAVE_TO_CSV,
                    },
                ]}
                isSplitButton={false}
                wrapperStyle={styles.flexGrow1}
            />
        </>
    );

    const getCustomRowProps = (accountID: number, email?: string) => ({
        errors: getLatestError(domainErrors?.memberErrors?.[email ?? accountID]?.errors),
        pendingAction: domainPendingActions?.member?.[email ?? accountID]?.pendingAction,
    });

    return (
        <BaseDomainMembersPage
            domainAccountID={domainAccountID}
            accountIDs={memberIDs ?? []}
            headerTitle={translate('domain.members.title')}
            headerContent={headerContent}
            searchPlaceholder={translate('domain.members.findMember')}
            onSelectRow={(item) => Navigation.navigate(ROUTES.DOMAIN_MEMBER_DETAILS.getRoute(domainAccountID, item.accountID))}
            headerIcon={illustrations.Profile}
            getCustomRowProps={getCustomRowProps}
            onDismissError={(item) => {
                if (!defaultSecurityGroupID) {
                    return;
                }
                clearAddMemberError(domainAccountID, item.accountID, item.login, defaultSecurityGroupID);
            }}
        />
        >
            <ConfirmModal
                    isVisible={isOfflineModalVisible}
                    onConfirm={() => setIsOfflineModalVisible(false)}
                    title={translate('common.youAppearToBeOffline')}
                    prompt={translate('common.thisFeatureRequiresInternet')}
                    confirmText={translate('common.buttonConfirm')}
                    shouldShowCancelButton={false}
                    onCancel={() => setIsOfflineModalVisible(false)}
                    shouldHandleNavigationBack
                />
        </BaseDomainMembersPage>
    );
}

DomainMembersPage.displayName = 'DomainMembersPage';

export default DomainMembersPage;
