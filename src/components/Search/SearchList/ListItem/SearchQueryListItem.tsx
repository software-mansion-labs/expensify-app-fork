import Icon from '@components/Icon';
import type {ListItem, ListItemFocusEventHandler} from '@components/SelectionList/ListItem/types';
import ListItemComposed from '@components/SelectionList/ListItemComposed';

import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

import type {OptionData} from '@libs/ReportUtils';

import CONST from '@src/CONST';
import type IconAsset from '@src/types/utils/IconAsset';

import type {ValueOf} from 'type-fest';

import React from 'react';
import {View} from 'react-native';

type SearchQueryItem = ListItem & {
    singleIcon?: IconAsset;
    /** Whether to apply the theme fill color to the icon. Set to false for multi-colored icons like avatars. Defaults to true. */
    shouldIconApplyFill?: boolean;
    searchItemType?: ValueOf<typeof CONST.SEARCH.SEARCH_ROUTER_ITEM_TYPE>;
    searchQuery?: string;
    autocompleteID?: string;
    roomType?: ValueOf<typeof CONST.SEARCH.DATA_TYPES>;
    mapKey?: string;
    /** Navigates to the destination represented by this suggestion. */
    action?: () => void;
};

type SearchQueryListItemProps = {
    item: SearchQueryItem;
    isFocused?: boolean;
    showTooltip: boolean;
    onSelectRow: (item: SearchQueryItem) => void;
    onFocus?: ListItemFocusEventHandler;
    shouldSyncFocus?: boolean;
    shouldDisableHoverStyle?: boolean;
};

function isSearchQueryItem(item: OptionData | SearchQueryItem): item is SearchQueryItem {
    return 'searchItemType' in item;
}

/**
 * A row with an optional icon, title, and subtitle used in the search router for autocomplete
 * suggestions, saved searches, and recent queries.
 *
 * Fully composed row: sits directly on ListItemComposed.Pressable and owns its layout,
 * without going through BaseListItem's legacy flag surface.
 */
function SearchQueryListItem({item, isFocused, showTooltip, onSelectRow, onFocus, shouldSyncFocus, shouldDisableHoverStyle}: SearchQueryListItemProps) {
    const styles = useThemeStyles();
    const theme = useTheme();
    const subtitle = item.alternateText;
    return (
        <ListItemComposed.Pressable
            item={item}
            pressableStyle={[styles.searchQueryListItemStyle, item.isSelected && styles.activeComponentBG, item.cursorStyle]}
            isFocused={isFocused}
            onSelectRow={onSelectRow}
            keyForList={item.keyForList}
            onFocus={onFocus}
            hoverStyle={item.isSelected && styles.activeComponentBG}
            shouldSyncFocus={shouldSyncFocus}
            shouldDisableHoverStyle={shouldDisableHoverStyle}
            shouldHighlightSelectedItem
        >
            {(_hovered, {isSelected}) => (
                <ListItemComposed.Row style={[styles.flexRow, styles.flex1, styles.justifyContentBetween, styles.userSelectNone, styles.alignItemsCenter]}>
                    {!!item.singleIcon && (
                        <Icon
                            src={item.singleIcon}
                            fill={item.shouldIconApplyFill !== false ? theme.icon : undefined}
                            additionalStyles={styles.mr3}
                            size={CONST.ICON_SIZE.MEDIUM}
                        />
                    )}
                    <View style={[styles.flex1, styles.flexColumn, styles.justifyContentCenter, styles.alignItemsStretch]}>
                        <ListItemComposed.Title
                            text={item.text ?? ''}
                            showTooltip={showTooltip}
                            style={[styles.justifyContentCenter, !!subtitle && styles.mb1]}
                        />
                        {!!subtitle && (
                            <ListItemComposed.Subtitle
                                text={subtitle}
                                showTooltip={showTooltip}
                            />
                        )}
                    </View>
                    {!!item.rightElement && <View style={[styles.ml2, styles.flexShrink1, styles.mw50]}>{item.rightElement}</View>}
                    <ListItemComposed.RBRIndicator
                        brickRoadIndicator={item.brickRoadIndicator}
                        isSelected={isSelected}
                        canShowSeveralIndicators={item.canShowSeveralIndicators}
                    />
                </ListItemComposed.Row>
            )}
        </ListItemComposed.Pressable>
    );
}

export default SearchQueryListItem;
export {isSearchQueryItem};
export type {SearchQueryItem, SearchQueryListItemProps};
