import Icon from '@components/Icon';
import {useListItemFocus} from '@components/SelectionList/ListItemFocusContext';

import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useStyleUtils from '@hooks/useStyleUtils';
import useThemeStyles from '@hooks/useThemeStyles';

import getButtonState from '@libs/getButtonState';

import variables from '@styles/variables';

import type {StyleProp, ViewStyle} from 'react-native';

import React from 'react';
import {View} from 'react-native';

type ListItemRightCaretProps = {
    /** Whether the parent row is disabled */
    isDisabled?: boolean;

    /** Whether the parent row is interactive */
    isInteractive?: boolean;

    /** base: used inside BaseListItem wrapper; content: used inside row content layouts */
    variant?: 'base' | 'content';
};

function ListItemRightCaret({isDisabled = false, isInteractive = true, variant = 'content'}: ListItemRightCaretProps) {
    const icons = useMemoizedLazyExpensifyIcons(['ArrowRight']);
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const {isHovered = false} = useListItemFocus();

    const containerStyle: StyleProp<ViewStyle> =
        variant === 'base' ? [styles.justifyContentCenter, styles.alignItemsCenter, styles.ml2] : [styles.popoverMenuIcon, styles.pointerEventsAuto, isDisabled && styles.cursorDisabled];

    return (
        <View style={containerStyle}>
            <Icon
                src={icons.ArrowRight}
                fill={StyleUtils.getIconFillColor(getButtonState(isHovered, false, false, !!isDisabled, isInteractive))}
                width={variables.iconSizeNormal}
                height={variables.iconSizeNormal}
                additionalStyles={variant === 'base' ? styles.alignSelfCenter : undefined}
            />
        </View>
    );
}

export default ListItemRightCaret;
