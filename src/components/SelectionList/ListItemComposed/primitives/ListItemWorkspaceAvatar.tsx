import SingleAvatar from '@components/Avatar/layouts/SingleAvatar';
import type {AvatarIcon} from '@components/Avatar/types';

import usePolicy from '@hooks/usePolicy';
import useThemeStyles from '@hooks/useThemeStyles';

import {getDefaultWorkspaceAvatar} from '@libs/ReportUtils';

import CONST from '@src/CONST';

import type {StyleProp, ViewStyle} from 'react-native';

import React from 'react';

type ListItemWorkspaceAvatarProps = {
    /** Policy to show the workspace avatar for */
    policyID: string;

    /** Fallback workspace name when the policy is not loaded */
    fallbackDisplayName?: string;

    /** Whether to show tooltips on avatar hover */
    showTooltip: boolean;

    /** Additional styles for the avatar container */
    style?: StyleProp<ViewStyle>;
};

/** Single workspace avatar resolved from the policy. Lightweight alternative to the report-based avatar for rows keyed by policy ID. */
function ListItemWorkspaceAvatar({policyID, fallbackDisplayName, showTooltip, style}: ListItemWorkspaceAvatarProps) {
    const styles = useThemeStyles();
    const policy = usePolicy(policyID);

    const name = policy?.name ?? fallbackDisplayName ?? '';
    const avatar: AvatarIcon = {
        id: policyID,
        type: CONST.ICON_TYPE_WORKSPACE,
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        source: policy?.avatarURL || getDefaultWorkspaceAvatar(name),
        name,
    };

    return (
        <SingleAvatar
            avatar={avatar}
            size={CONST.AVATAR_SIZE.DEFAULT}
            shouldShowTooltip={showTooltip}
            fallbackDisplayName={fallbackDisplayName}
            containerStyles={[styles.actionAvatar, styles.mr3, style]}
        />
    );
}

export default ListItemWorkspaceAvatar;
