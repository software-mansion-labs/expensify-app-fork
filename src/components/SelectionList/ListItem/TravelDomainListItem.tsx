import Badge from '@components/Badge';
import ListItemComposed from '@components/SelectionList/ListItemComposed';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';

import React from 'react';

import type {ListItem, TravelDomainListItemProps} from './types';

import SelectableListItem from './SelectableListItem';

/**
 * A text row with a left-side checkbox and an optional "Recommended" badge. Used in the
 * travel domain selector for choosing booking domains.
 */
function TravelDomainListItem<TItem extends ListItem>({
    item,
    isFocused,
    isFocusVisible,
    showTooltip,
    isDisabled,
    canSelectMultiple,
    onSelectRow,
    onSelectionButtonPress,
    onFocus,
    shouldSyncFocus,
    selectionButtonPosition = CONST.SELECTION_BUTTON_POSITION.LEFT,
}: TravelDomainListItemProps<TItem>) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const showRecommendedTag = item.isRecommended ?? false;

    return (
        <SelectableListItem
            item={item}
            wrapperStyle={[styles.flex1, styles.sidebarLinkInner, styles.userSelectNone, styles.optionRow]}
            isFocused={isFocused}
            isFocusVisible={isFocusVisible}
            isDisabled={isDisabled}
            showTooltip={showTooltip}
            canSelectMultiple={canSelectMultiple}
            onSelectRow={onSelectRow}
            onSelectionButtonPress={onSelectionButtonPress}
            keyForList={item.keyForList}
            onFocus={onFocus}
            shouldSyncFocus={shouldSyncFocus}
            rightHandSideComponent={showRecommendedTag ? <Badge text={translate('travel.domainSelector.recommended')} /> : undefined}
            selectionButtonPosition={selectionButtonPosition}
        >
            <ListItemComposed.Title
                text={item.text ?? ''}
                showTooltip={showTooltip}
                style={[item.isBold === false && [styles.fontWeightNormal, styles.textSupporting], styles.flex1]}
            />
        </SelectableListItem>
    );
}

export default TravelDomainListItem;
