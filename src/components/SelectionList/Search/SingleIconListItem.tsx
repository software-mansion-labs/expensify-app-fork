import React from 'react';
import {View} from 'react-native';
import Icon from '@components/Icon';
import BaseListItem from '@components/SelectionList/BaseListItem';
import type {ListItem, SingleIconListItemType} from '@components/SelectionList/types';
import TextWithTooltip from '@components/TextWithTooltip';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

type SingleIconListItemProps<TItem extends ListItem> = {
    item: TItem;
    isFocused?: boolean;
    showTooltip?: boolean;
    onSelectRow: (item: TItem) => void;
    onFocus?: () => void;
};

function SingleIconListItem<TItem extends SingleIconListItemType>({item, isFocused, showTooltip, onSelectRow, onFocus}: SingleIconListItemProps<TItem>) {
    const styles = useThemeStyles();
    const theme = useTheme();

    return (
        <BaseListItem
            item={item}
            pressableStyle={[[styles.singleIconListItemStyle, item.isSelected && styles.activeComponentBG, isFocused && styles.sidebarLinkActive, item.cursorStyle]]}
            wrapperStyle={[styles.flexRow, styles.flex1, styles.justifyContentBetween, styles.userSelectNone, styles.alignItemsCenter]}
            isFocused={isFocused}
            onSelectRow={onSelectRow}
            keyForList={item.keyForList}
            onFocus={onFocus}
            hoverStyle={item.isSelected && styles.activeComponentBG}
        >
            <>
                {item.singleIcon && (
                    <Icon
                        src={item.singleIcon}
                        fill={theme.icon}
                        additionalStyles={styles.mr2}
                        small
                    />
                )}
                <View style={[styles.flex1, styles.flexColumn, styles.justifyContentCenter, styles.alignItemsStretch]}>
                    <TextWithTooltip
                        shouldShowTooltip={showTooltip ?? false}
                        text={item.text ?? ''}
                        style={[
                            styles.optionDisplayName,
                            isFocused ? styles.sidebarLinkActiveText : styles.sidebarLinkText,
                            styles.sidebarLinkTextBold,
                            styles.pre,
                            item.alternateText ? styles.mb1 : null,
                            styles.justifyContentCenter,
                        ]}
                    />
                    {item.alternateText && (
                        <TextWithTooltip
                            shouldShowTooltip={showTooltip ?? false}
                            text={item.alternateText}
                            style={[styles.textLabelSupporting, styles.lh16, styles.pre]}
                        />
                    )}
                </View>
            </>
        </BaseListItem>
    );
}

SingleIconListItem.displayName = 'SingleIconListItem';

export default SingleIconListItem;
export type {SingleIconListItemProps};
