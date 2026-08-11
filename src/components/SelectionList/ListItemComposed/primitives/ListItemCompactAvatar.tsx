import Avatar from '@components/Avatar';

import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';
import type {Icon} from '@src/types/onyx/OnyxCommon';

import type {StyleProp, ViewStyle} from 'react-native';

import React from 'react';
import {View} from 'react-native';

type ListItemCompactAvatarProps = {
    /** Icon data for the avatar */
    icon: Icon;

    /** Additional styles merged onto the avatar container (e.g. to override the default right margin) */
    style?: StyleProp<ViewStyle>;
};

function ListItemCompactAvatar({icon, style}: ListItemCompactAvatarProps) {
    const styles = useThemeStyles();

    return (
        <View style={[styles.mentionSuggestionsAvatarContainer, styles.mr3, style]}>
            <Avatar
                source={icon.source}
                size={CONST.AVATAR_SIZE.X_SMALL}
                name={icon.name}
                avatarID={icon.id}
                type={icon.type ?? CONST.ICON_TYPE_AVATAR}
                fallbackIcon={icon.fallbackIcon}
            />
        </View>
    );
}

export default ListItemCompactAvatar;
