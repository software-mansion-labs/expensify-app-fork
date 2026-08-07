import ReportActionAvatars from '@components/ReportActionAvatars';
import {useListItemFocus} from '@components/SelectionList/ListItemFocusContext';

import useStyleUtils from '@hooks/useStyleUtils';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

import type {ViewStyle} from 'react-native';

import React from 'react';

type ListItemReportAvatarProps = {
    /** Report to load avatars from */
    reportID?: string;

    /** Fallback display name when avatars cannot be resolved */
    fallbackDisplayName?: string;

    /** Whether to show tooltips on avatar hover */
    showTooltip: boolean;

    /** Additional styles for the single-avatar container */
    singleAvatarContainerStyle?: ViewStyle[];
};

/** Avatar(s) resolved from a report — participants, subscript workspace avatars, invoice icons, etc.
 * Focus/hover state for the subscript border comes from ListItemFocusContext (provided by ListItemComposed.Pressable). */
function ListItemReportAvatar({reportID, fallbackDisplayName, showTooltip, singleAvatarContainerStyle}: ListItemReportAvatarProps) {
    const styles = useThemeStyles();
    const theme = useTheme();
    const StyleUtils = useStyleUtils();
    const {isFocusVisible, isHovered = false} = useListItemFocus();

    const focusedBackgroundColor = styles.sidebarLinkActive.backgroundColor;
    const subscriptAvatarBorderColor = isFocusVisible ? focusedBackgroundColor : theme.sidebar;
    const hoveredBackgroundColor = !!styles.sidebarLinkHover && 'backgroundColor' in styles.sidebarLinkHover ? styles.sidebarLinkHover.backgroundColor : theme.sidebar;

    return (
        <ReportActionAvatars
            subscriptAvatarBorderColor={isHovered && !isFocusVisible ? hoveredBackgroundColor : subscriptAvatarBorderColor}
            shouldShowTooltip={showTooltip}
            secondaryAvatarContainerStyle={[
                StyleUtils.getBackgroundAndBorderStyle(theme.sidebar),
                isFocusVisible ? StyleUtils.getBackgroundAndBorderStyle(focusedBackgroundColor) : undefined,
                isHovered && !isFocusVisible ? StyleUtils.getBackgroundAndBorderStyle(hoveredBackgroundColor) : undefined,
            ]}
            reportID={reportID}
            fallbackDisplayName={fallbackDisplayName}
            singleAvatarContainerStyle={[styles.actionAvatar, styles.mr3, ...(singleAvatarContainerStyle ?? [])]}
        />
    );
}

export default ListItemReportAvatar;
