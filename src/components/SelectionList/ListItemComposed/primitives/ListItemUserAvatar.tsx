import SingleAvatar from '@components/Avatar/layouts/SingleAvatar';
import type {AvatarIcon} from '@components/Avatar/types';
import {usePersonalDetails} from '@components/OnyxListItemProvider';

import useDefaultAvatars from '@hooks/useDefaultAvatars';
import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';

import type {StyleProp, ViewStyle} from 'react-native';

import React from 'react';

type ListItemUserAvatarProps = {
    /** Account to show the avatar for */
    accountID: number;

    /** Fallback display name for the tooltip when the account has no details */
    fallbackDisplayName?: string;

    /** Whether to show tooltips on avatar hover */
    showTooltip: boolean;

    /** Additional styles for the avatar container */
    style?: StyleProp<ViewStyle>;
};

/** Single user avatar resolved from personal details. Lightweight alternative to the report-based avatar for rows keyed by account ID. */
function ListItemUserAvatar({accountID, fallbackDisplayName, showTooltip, style}: ListItemUserAvatarProps) {
    const styles = useThemeStyles();
    const personalDetails = usePersonalDetails();
    const defaultAvatars = useDefaultAvatars();

    const details = personalDetails?.[accountID];
    const avatar: AvatarIcon = {
        id: accountID,
        type: CONST.ICON_TYPE_AVATAR,
        source: details?.avatar ?? defaultAvatars.FallbackAvatar,
        name: details?.login ?? '',
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

export default ListItemUserAvatar;
