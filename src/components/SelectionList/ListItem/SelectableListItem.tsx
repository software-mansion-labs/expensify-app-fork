import ListSelectionButton from '@components/SelectionList/components/ListSelectionButton';
import ListItemComposed from '@components/SelectionList/ListItemComposed';

import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';

import React from 'react';

import type {ListItem, ListItemRenderContext, SelectableListItemProps} from './types';

import BaseListItem from './BaseListItem';

/**
 * Extends BaseListItem with a selection button (checkbox for multi-select, radio for single-select),
 * injected through composition around the row content. This is the layer used by all SelectionList
 * items that show a visual selection indicator. Items that never need a selection button
 * (e.g. search result rows) use BaseListItem directly, or pass showSelectionButton={false}.
 */
function SelectableListItem<TItem extends ListItem>({
    canSelectMultiple = false,
    selectionButtonPosition = CONST.SELECTION_BUTTON_POSITION.RIGHT,
    showSelectionButton = true,
    item,
    onSelectionButtonPress,
    onSelectRow,
    isDisabled = false,
    children,
    shouldDisplayRBR = true,
    isFocused,
    ...baseProps
}: SelectableListItemProps<TItem>) {
    const styles = useThemeStyles();
    const isLeftPositioned = selectionButtonPosition === CONST.SELECTION_BUTTON_POSITION.LEFT;

    const selectionButton =
        showSelectionButton && !item.shouldHideSelectionButton ? (
            <ListSelectionButton
                role={canSelectMultiple ? CONST.ROLE.CHECKBOX : CONST.ROLE.RADIO}
                item={item}
                onSelectRow={onSelectionButtonPress ?? onSelectRow}
                disabled={!!isDisabled || !!item.isDisabledCheckbox}
                style={isLeftPositioned ? styles.mr3 : styles.ml3}
            />
        ) : null;

    // The RBR indicator is rendered here (instead of by BaseListItem) so a right-positioned
    // selection button keeps its legacy place after the indicator.
    const composedChildren = (hovered: boolean, renderContext?: ListItemRenderContext) => (
        <>
            {isLeftPositioned && selectionButton}
            {typeof children === 'function' ? children(hovered, renderContext) : children}
            {shouldDisplayRBR && (
                <ListItemComposed.RBRIndicator
                    brickRoadIndicator={item.brickRoadIndicator}
                    isSelected={renderContext?.isSelected}
                    canShowSeveralIndicators={item.canShowSeveralIndicators}
                />
            )}
            {!isLeftPositioned && selectionButton}
        </>
    );

    return (
        <BaseListItem
            {...baseProps}
            item={item}
            isFocused={isFocused}
            isDisabled={isDisabled}
            canSelectMultiple={canSelectMultiple}
            onSelectRow={onSelectRow}
            shouldDisplayRBR={false}
        >
            {composedChildren}
        </BaseListItem>
    );
}

export default SelectableListItem;
