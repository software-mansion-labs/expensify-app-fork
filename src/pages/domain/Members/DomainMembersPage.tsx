import {defaultSecurityGroupIDSelector, memberAccountIDsSelector} from '@selectors/Domain';
import React from 'react';
import Button from '@components/Button';
import ButtonWithDropdownMenu from '@components/ButtonWithDropdownMenu';
import useConfirmModal from '@hooks/useConfirmModal';
import {useMemoizedLazyExpensifyIcons, useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import {clearAddMemberError} from '@libs/actions/Domain';
import {getLatestError} from '@libs/ErrorUtils';
import Navigation from '@navigation/Navigation';
import type {PlatformStackScreenProps} from '@navigation/PlatformStackNavigation/types';
import type {DomainSplitNavigatorParamList} from '@navigation/types';
import BaseDomainMembersPage from '@pages/domain/BaseDomainMembersPage';
import {close} from '@userActions/Modal';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

type DomainMembersPageProps = PlatformStackScreenProps<DomainSplitNavigatorParamList, typeof SCREENS.DOMAIN.MEMBERS>;

function DomainMembersPage({route}: DomainMembersPageProps) {
    const {domainAccountID} = route.params;
    const {translate} = useLocalize();
    const illustrations = useMemoizedLazyIllustrations(['Profile']);
    const icons = useMemoizedLazyExpensifyIcons(['Plus', 'Gear', 'Download']);
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const styles = useThemeStyles();
    const {isOffline} = useNetwork();

    const [domainErrors] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN_ERRORS}${domainAccountID}`, {canBeMissing: true});
    const [domainPendingActions] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN_PENDING_ACTIONS}${domainAccountID}`, {canBeMissing: true});
    const [defaultSecurityGroupID] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${domainAccountID}`, {canBeMissing: true, selector: defaultSecurityGroupIDSelector});

    const [memberIDs] = useOnyx(`${ONYXKEYS.COLLECTION.DOMAIN}${domainAccountID}`, {
        canBeMissing: true,
        selector: memberAccountIDsSelector,
    });

    const {showConfirmModal} = useConfirmModal();

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
                        value: CONST.DOMAIN.MEMBERS.SECONDARY_ACTIONS.SETTINGS,
                        text: translate('domain.common.settings'),
                        icon: icons.Gear,
                        onSelected: () => Navigation.navigate(ROUTES.DOMAIN_MEMBERS_SETTINGS.getRoute(domainAccountID)),
                    },
                    {
                        text: translate('spreadsheet.downloadCSV'),
                        icon: icons.Download,
                        onSelected: () => {
                            if (isOffline) {
                                close(() => {
                                    showConfirmModal({
                                        title: translate('common.youAppearToBeOffline'),
                                        prompt: translate('common.thisFeatureRequiresInternet'),
                                        confirmText: translate('common.buttonConfirm'),
                                        shouldShowCancelButton: false,
                                        shouldHandleNavigationBack: true,
                                    });
                                });
                                return;
                            }

                            close(() => {
                                // API call responsible for downloading members as a CSV file
                            });
                        },
                        value: CONST.DOMAIN.MEMBERS.SECONDARY_ACTIONS.SAVE_TO_CSV,
                    },
                ]}
                isSplitButton={false}
                wrapperStyle={shouldUseNarrowLayout && [styles.flexGrow1, styles.mb3]}
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
    );
}

DomainMembersPage.displayName = 'DomainMembersPage';

export default DomainMembersPage;
