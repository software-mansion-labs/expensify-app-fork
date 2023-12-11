import PropTypes from 'prop-types';
import React, {useMemo} from 'react';
import {withOnyx} from 'react-native-onyx';
import _ from 'underscore';
import * as Expensicons from '@components/Icon/Expensicons';
import HeaderPageLayout from '@components/HeaderPageLayout';
import MenuItem from '@components/MenuItem';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import * as PolicyUtils from '@libs/PolicyUtils';
import * as ReportUtils from '@libs/ReportUtils';
import useTheme from '@styles/themes/useTheme';
import * as Policy from '@userActions/Policy';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import SCREENS from '@src/SCREENS';

const propTypes = {
    /** The list of this user's policies */
    policies: PropTypes.objectOf(
        PropTypes.shape({
            /** The ID of the policy */
            id: PropTypes.string,

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
    activeWorkspaceID: PropTypes.arrayOf([PropTypes.undefined, PropTypes.string]),
};

const defaultProps = {
    policies: {},
    activeWorkspaceID: undefined,
};


function WorkspacesSelectorPage({policies, activeWorkspaceID}) {
    const theme = useTheme();
    const {translate} = useLocalize();
    const {isOffline} = useNetwork();

    /**
     * Gets the menu item for each workspace
     *
     * @param {Object} item
     * @param {Number} index
     * @returns {JSX}
     */
    function getMenuItem(item) {
        const keyTitle = item.translationKey ? translate(item.translationKey) : item.title;

        return (
                <MenuItem
                    title={keyTitle}
                    icon={item.icon}
                    iconType={CONST.ICON_TYPE_WORKSPACE}
                    onPress={item.action}
                    iconStyles={item.iconStyles}
                    iconFill={item.iconFill}
                    shouldShowRightIcon
                    fallbackIcon={item.fallbackIcon}
                    brickRoadIndicator={item.brickRoadIndicator}
                    disabled={item.disabled}
                />
        );
    }

    /**
     * Add free policies (workspaces) to the list of menu items and returns the list of menu items
     * @returns {Array} the menu item list
     */
    const workspaces = useMemo(() => _.chain(policies)
            .filter((policy) => PolicyUtils.shouldShowPolicy(policy, isOffline))
            .map((policy) => ({
                title: activeWorkspaceID === policy.id ? `${policy.name} (Active)` : policy.name,
                icon: policy.avatar ? policy.avatar : ReportUtils.getDefaultWorkspaceAvatar(policy.name),
                iconType: policy.avatar ? CONST.ICON_TYPE_AVATAR : CONST.ICON_TYPE_ICON,
                action: () => {Policy.selectWorkspace(policy.id)},
                iconFill: theme.textLight,
                fallbackIcon: Expensicons.FallbackWorkspaceAvatar,
                pendingAction: policy.pendingAction,
                errors: policy.errors,
                disabled: policy.pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE,
            }))
            .sortBy((policy) => policy.title.toLowerCase())
            .value(), [policies, isOffline, activeWorkspaceID, theme.textLight]);

    return (
        <HeaderPageLayout
            title="Choose a workspace"
            backgroundColor={theme.PAGE_THEMES[SCREENS.WORKSPACE_SELECTOR.ROOT].backgroundColor}
        >
            {_.isEmpty(workspaces) ? (
                <></>
            ) : (
                _.map(workspaces, (item, index) => getMenuItem(item, index))
            )}
        </HeaderPageLayout>
    );
}

WorkspacesSelectorPage.propTypes = propTypes;
WorkspacesSelectorPage.defaultProps = defaultProps;
WorkspacesSelectorPage.displayName = 'WorkspacesSelectorPage';

export default withOnyx({
    policies: {
        key: ONYXKEYS.COLLECTION.POLICY,
    },
    activeWorkspaceID: {
        key: ONYXKEYS.ACTIVE_WORKSPACE_ID
    }
})(WorkspacesSelectorPage);
