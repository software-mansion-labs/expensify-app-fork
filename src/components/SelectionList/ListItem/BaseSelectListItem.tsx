import ListItemComposed from '@components/SelectionList/ListItemComposed';

import useThemeStyles from '@hooks/useThemeStyles';

import variables from '@styles/variables';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

import type {BaseSelectListItemProps, ListItem} from './types';

import SelectableListItem from './SelectableListItem';

/**
 * A text-only row with a title and optional subtitle, built on BaseListItem. Serves as the
 * base for SingleSelectListItem and MultiSelectListItem.
 */
function BaseSelectListItem<TItem extends ListItem>({
    item,
    isFocused,
    showTooltip,
    isDisabled,
    onSelectRow,
    onDismissError,
    shouldPreventEnterKeySubmit,
    rightHandSideComponent,
    isMultilineSupported = false,
    isAlternateTextMultilineSupported = false,
    alternateTextNumberOfLines = 2,
    titleNumberOfLines = 2,
    canSelectMultiple,
    onFocus,
    shouldSyncFocus,
    wrapperStyle,
    titleStyles,
    shouldHighlightSelectedItem,
    isFocusVisible,
    accessibilityRole,
    selectionButtonPosition,
}: BaseSelectListItemProps<TItem>) {
    const styles = useThemeStyles();
    const fullTitle = isMultilineSupported ? item.text?.trimStart() : item.text;
    const indentsLength = (item.text?.length ?? 0) - (fullTitle?.length ?? 0);
    const paddingLeft = Math.floor(indentsLength / CONST.INDENTS.length) * styles.ml3.marginLeft;
    const alternateTextMaxWidth = variables.sideBarWidth - styles.ph5.paddingHorizontal * 2 - styles.ml3.marginLeft - variables.iconSizeNormal;

    return (
        <SelectableListItem
            item={item}
            wrapperStyle={[styles.flex1, styles.justifyContentBetween, styles.sidebarLinkInner, styles.userSelectNone, styles.optionRow, wrapperStyle]}
            isFocused={isFocused}
            isFocusVisible={isFocusVisible}
            isDisabled={isDisabled}
            showTooltip={showTooltip}
            onSelectRow={onSelectRow}
            onDismissError={onDismissError}
            shouldPreventEnterKeySubmit={shouldPreventEnterKeySubmit}
            rightHandSideComponent={rightHandSideComponent}
            canSelectMultiple={canSelectMultiple}
            keyForList={item.keyForList}
            onFocus={onFocus}
            shouldSyncFocus={shouldSyncFocus}
            pendingAction={item.pendingAction}
            errors={item.errors}
            shouldHighlightSelectedItem={shouldHighlightSelectedItem}
            accessibilityRole={accessibilityRole}
            selectionButtonPosition={selectionButtonPosition}
        >
            <>
                {!!item.leftElement && item.leftElement}
                <View style={[styles.flex1, styles.alignItemsStart, !!item.rightElement && styles.pr3]}>
                    <ListItemComposed.Title
                        text={fullTitle ?? ''}
                        showTooltip={showTooltip}
                        numberOfLines={isMultilineSupported ? titleNumberOfLines : 1}
                        style={[isMultilineSupported && [styles.preWrap, {paddingLeft}], !!item.alternateText && styles.mb1, !!isDisabled && styles.colorMuted, titleStyles]}
                    />

                    {!!item.alternateText && (
                        <ListItemComposed.Subtitle
                            text={item.alternateText}
                            showTooltip={showTooltip}
                            numberOfLines={isAlternateTextMultilineSupported ? alternateTextNumberOfLines : 1}
                            style={isAlternateTextMultilineSupported && [styles.preWrap, {maxWidth: alternateTextMaxWidth}]}
                        />
                    )}
                </View>
                {!!item.rightElement && item.rightElement}
            </>
        </SelectableListItem>
    );
}

export default BaseSelectListItem;
