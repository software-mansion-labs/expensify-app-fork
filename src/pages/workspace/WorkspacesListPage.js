import PropTypes from 'prop-types';
import React, {useMemo, useState} from 'react';
import {View} from 'react-native';
import {withOnyx} from 'react-native-onyx';
import _ from 'underscore';
import Button from '@components/Button';
import ConfirmModal from '@components/ConfirmModal';
import FeatureList from '@components/FeatureList';
import * as Expensicons from '@components/Icon/Expensicons';
import * as Illustrations from '@components/Icon/Illustrations';
import IllustratedHeaderPageLayout from '@components/IllustratedHeaderPageLayout';
import LottieAnimations from '@components/LottieAnimations';
import MenuItem from '@components/MenuItem';
import OfflineWithFeedback from '@components/OfflineWithFeedback';
import {PressableWithoutFeedback} from '@components/Pressable';
import withCurrentUserPersonalDetails from '@components/withCurrentUserPersonalDetails';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import useWindowDimensions from '@hooks/useWindowDimensions';
import compose from '@libs/compose';
import * as CurrencyUtils from '@libs/CurrencyUtils';
import Navigation from '@libs/Navigation/Navigation';
import * as PolicyUtils from '@libs/PolicyUtils';
import * as ReportUtils from '@libs/ReportUtils';
import policyMemberPropType from '@pages/policyMemberPropType';
import * as ReimbursementAccountProps from '@pages/ReimbursementAccount/reimbursementAccountPropTypes';
import * as App from '@userActions/App';
import * as Policy from '@userActions/Policy';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import SCREENS from '@src/SCREENS';
import withPolicyAndFullscreenLoading from './withPolicyAndFullscreenLoading';
import WorkspacesListRow from './WorkspacesListRow';

const propTypes = {
    /** The list of this user's policies */
    policies: PropTypes.objectOf(
        PropTypes.shape({
            /** The ID of the policy */
            ID: PropTypes.string,

            /** The name of the policy */
            name: PropTypes.string,

            /** The type of the policy */
            type: PropTypes.string,

            /** The user's role in the policy */
            role: PropTypes.string,

            /** The current action that is waiting to happen on the policy */
            pendingAction: PropTypes.oneOf(_.values(CONST.RED_BRICK_ROAD_PENDING_ACTION)),
        }),
    ),

    /** Bank account attached to free plan */
    reimbursementAccount: ReimbursementAccountProps.reimbursementAccountPropTypes,

    /** A collection of objects for all policies which key policy member objects by accountIDs */
    allPolicyMembers: PropTypes.objectOf(PropTypes.objectOf(policyMemberPropType)),

    /** The user's wallet account */
    userWallet: PropTypes.shape({
        /** The user's current wallet balance */
        currentBalance: PropTypes.number,
    }),
};

const defaultProps = {
    policies: {},
    allPolicyMembers: {},
    reimbursementAccount: {},
    userWallet: {
        currentBalance: 0,
    },
};

const workspaceFeatures = [
    {
        icon: Illustrations.MoneyReceipts,
        translationKey: 'workspace.emptyWorkspace.features.trackAndCollect',
    },
    {
        icon: Illustrations.CreditCardsNew,
        translationKey: 'workspace.emptyWorkspace.features.companyCards',
    },
    {
        icon: Illustrations.MoneyWings,
        translationKey: 'workspace.emptyWorkspace.features.reimbursements',
    },
];

/**
 * Dismisses the errors on one item
 *
 * @param {string} policyID
 * @param {string} pendingAction
 */
function dismissWorkspaceError(policyID, pendingAction) {
    if (pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE) {
        Policy.clearDeleteWorkspaceError(policyID);
        return;
    }

    if (pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.ADD) {
        Policy.removeWorkspace(policyID);
        return;
    }
    throw new Error('Not implemented');
}

function WorkspacesListPage({policies, allPolicyMembers, reimbursementAccount, userWallet, currentUserPersonalDetails, reports}) {
    const theme = useTheme();
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {isOffline} = useNetwork();
    const {isSmallScreenWidth} = useWindowDimensions();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    //TODO: add correct three dots items
    const threeDotsMenuItems = useMemo(() => {
        const items = [
            {
                icon: Expensicons.Trashcan,
                text: translate('workspace.common.delete'),
                onSelected: () => {
                    
                    setIsDeleteModalOpen(true);
                },
            },
        ];

        return items;
    }, [translate]);

    /**
     * @param {Boolean} isPaymentItem whether the item being rendered is the payments menu item
     * @returns {String|undefined} the user's wallet balance
     */
    function getWalletBalance(isPaymentItem) {
        return isPaymentItem ? CurrencyUtils.convertToDisplayString(userWallet.currentBalance) : undefined;
    }

    const confirmDeleteAndHideModal = () => {};

    /**
     * Gets the menu item for each workspace
     *
     * @param {Object} item
     * @param {Number} index
     * @returns {JSX}
     */
    function getMenuItem(item, index) {
        const keyTitle = item.translationKey ? translate(item.translationKey) : item.title;
        const isPaymentItem = item.translationKey === 'common.wallet';
        return (
            <OfflineWithFeedback
                key={`${keyTitle}_${index}`}
                pendingAction={item.pendingAction}
                errorRowStyles={styles.ph5}
                onClose={item.dismissError}
                errors={item.errors}
            >
                <PressableWithoutFeedback
                    style={[styles.mh5, styles.mb3]}
                    onPress={item.action}
                >
                    <WorkspacesListRow
                        title={keyTitle}
                        menuItems={threeDotsMenuItems}
                        workspaceIcon={item.icon}
                        ownerAccountID={currentUserPersonalDetails.accountID}
                        workspaceType={item.type}
                        currentUserPersonalDetails={currentUserPersonalDetails}
                        layoutWidth={isSmallScreenWidth ? CONST.LAYOUT_WIDTH.NARROW : CONST.LAYOUT_WIDTH.WIDE}
                    />
                </PressableWithoutFeedback>
                {/* <MenuItem
                    title={keyTitle}
                    icon={item.icon}
                    iconType={CONST.ICON_TYPE_WORKSPACE}
                    onPress={item.action}
                    iconStyles={item.iconStyles}
                    iconFill={item.iconFill}
                    shouldShowRightIcon
                    badgeText={getWalletBalance(isPaymentItem)}
                    fallbackIcon={item.fallbackIcon}
                    brickRoadIndicator={item.brickRoadIndicator}
                    disabled={item.disabled}
                /> */}
            </OfflineWithFeedback>
        );
    }

    /**
     * Add free policies (workspaces) to the list of menu items and returns the list of menu items
     * @returns {Array} the menu item list
     */
    const workspaces = useMemo(() => {
        const reimbursementAccountBrickRoadIndicator = !_.isEmpty(reimbursementAccount.errors) ? CONST.BRICK_ROAD_INDICATOR_STATUS.ERROR : '';
        return _.chain(policies)
            .filter((policy) => PolicyUtils.shouldShowPolicy(policy, isOffline))
            .map((policy) => ({
                title: policy.name,
                icon: policy.avatar ? policy.avatar : ReportUtils.getDefaultWorkspaceAvatar(policy.name),
                iconType: policy.avatar ? CONST.ICON_TYPE_AVATAR : CONST.ICON_TYPE_ICON,
                action: () => Navigation.navigate(ROUTES.WORKSPACE_INITIAL.getRoute(policy.id)),
                iconFill: theme.textLight,
                fallbackIcon: Expensicons.FallbackWorkspaceAvatar,
                brickRoadIndicator: reimbursementAccountBrickRoadIndicator || PolicyUtils.getPolicyBrickRoadIndicatorStatus(policy, allPolicyMembers),
                pendingAction: policy.pendingAction,
                errors: policy.errors,
                dismissError: () => dismissWorkspaceError(policy.id, policy.pendingAction),
                disabled: policy.pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE,
            }))
            .sortBy((policy) => policy.title.toLowerCase())
            .value();
    }, [reimbursementAccount.errors, policies, isOffline, theme.textLight, allPolicyMembers]);

    return (
        <IllustratedHeaderPageLayout
            backgroundColor={theme.PAGE_THEMES[SCREENS.SETTINGS.WORKSPACES].backgroundColor}
            illustration={LottieAnimations.WorkspacePlanet}
            onBackButtonPress={() => Navigation.goBack(ROUTES.SETTINGS.ROOT)}
            title={translate('common.workspaces')}
            shouldUseCentralPaneView
            footer={
                <Button
                    accessibilityLabel={translate('workspace.new.newWorkspace')}
                    success
                    text={translate('workspace.new.newWorkspace')}
                    onPress={() => App.createWorkspaceWithPolicyDraftAndNavigateToIt()}
                />
            }
        >
            {_.isEmpty(workspaces) ? (
                <FeatureList
                    menuItems={workspaceFeatures}
                    headline="workspace.emptyWorkspace.title"
                    description="workspace.emptyWorkspace.subtitle"
                />
            ) : (
                _.map(workspaces, (item, index) => getMenuItem(item, index))
            )}
            <ConfirmModal
                title={translate('workspace.common.delete')}
                isVisible={isDeleteModalOpen}
                onConfirm={confirmDeleteAndHideModal}
                onCancel={() => setIsDeleteModalOpen(false)}
                prompt={translate('workspace.common.deleteConfirmation')}
                confirmText={translate('common.delete')}
                cancelText={translate('common.cancel')}
                danger
            />
        </IllustratedHeaderPageLayout>
    );
}

WorkspacesListPage.propTypes = propTypes;
WorkspacesListPage.defaultProps = defaultProps;
WorkspacesListPage.displayName = 'WorkspacesListPage';

export default compose(
    withPolicyAndFullscreenLoading,
    withOnyx({
        policies: {
            key: ONYXKEYS.COLLECTION.POLICY,
        },
        allPolicyMembers: {
            key: ONYXKEYS.COLLECTION.POLICY_MEMBERS,
        },
        reimbursementAccount: {
            key: ONYXKEYS.REIMBURSEMENT_ACCOUNT,
        },
        userWallet: {
            key: ONYXKEYS.USER_WALLET,
        },
        reports: {
            key: ONYXKEYS.COLLECTION.REPORT,
        },
    }),
    withCurrentUserPersonalDetails,
)(WorkspacesListPage);
