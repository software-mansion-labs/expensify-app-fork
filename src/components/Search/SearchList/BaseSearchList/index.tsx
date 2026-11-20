import useTabRootScrollProps from '@components/Navigation/TabBarBottomContent/useTabRootScrollProps';
import type {SearchListItem} from '@components/Search/SearchList/ListItem/types';
import SearchListScrollLockContext, {useSearchListScrollLockStyle} from '@components/Search/SearchListScrollLockContext';

import useThemeStyles from '@hooks/useThemeStyles';

import type {ComponentRef} from 'react';
import type {LayoutChangeEvent, StyleProp, ViewProps, ViewStyle} from 'react-native';

import {FlashList} from '@shopify/flash-list';
import React, {useContext, useState} from 'react';
import {View} from 'react-native';
import Animated from 'react-native-reanimated';

import type BaseSearchListProps from './types';

import SearchListFocusTargetContext from './SearchListFocusTargetContext';
import useSearchListFocus from './useSearchListFocus';

const AnimatedFlashListComponent = Animated.createAnimatedComponent(FlashList<SearchListItem>);

type CellRendererComponentProps = ViewProps & {
    ref?: React.Ref<ComponentRef<typeof View>>;
    style?: StyleProp<ViewStyle>;
};

function CellRendererComponent({children, ref, style, ...props}: CellRendererComponentProps) {
    const styles = useThemeStyles();

    return (
        <View
            ref={ref}
            {...props}
            // Keep the FlashList cell itself tracking the animated search pane width.
            style={[style, styles.w100]}
        >
            {children}
        </View>
    );
}

function BaseSearchList({
    data,
    columns,
    renderItem,
    onSelectRow,
    keyExtractor,
    onScroll,
    ref,
    onEndReached,
    onEndReachedThreshold,
    selectionTopBar,
    ListFooterComponent,
    onViewableItemsChanged,
    onLayout,
    contentContainerStyle,
    flattenedItemsLength,
    newTransactions,
    isAttendeesEnabledForMovingPolicy,
    nonPersonalAndWorkspaceCards,
    stickyHeaderIndices,
    stickyHeaderConfig,
    getItemType,
    overrideItemLayout,
    focusStops,
    resolveFocusStopIndex,
    onSelectFocusStop,
}: BaseSearchListProps) {
    const tabRootScrollProps = useTabRootScrollProps(contentContainerStyle);
    // Chrome ends a drag at the first scroller with `overscroll-behavior` set even when that scroller can't move,
    // so a list shorter than its viewport would keep a pull on its rows from reaching the outer scroller that brings the header back.
    const isUnderScrollAwayHeader = useContext(SearchListScrollLockContext) !== undefined;
    const [listHeight, setListHeight] = useState(0);
    const [listContentHeight, setListContentHeight] = useState(0);
    const scrollLockStyle = useSearchListScrollLockStyle(listContentHeight - listHeight > 1);

    const {getOnFocus, focusTargetContextValue} = useSearchListFocus({
        data,
        onSelectRow,
        ref,
        contentContainerStyle,
        flattenedItemsLength,
        focusStops,
        resolveFocusStopIndex,
        onSelectFocusStop,
    });

    const renderItemWithKeyboardFocus = ({item, index}: {item: SearchListItem; index: number}) => renderItem(item, index, getOnFocus(index));

    const handleLayout = (event: LayoutChangeEvent) => {
        if (isUnderScrollAwayHeader) {
            setListHeight(event.nativeEvent.layout.height);
        }
        onLayout?.(event);
    };

    const handleContentSizeChange = isUnderScrollAwayHeader ? (width: number, height: number) => setListContentHeight(height) : undefined;

    const extraData = [columns, newTransactions, nonPersonalAndWorkspaceCards, isAttendeesEnabledForMovingPolicy];

    return (
        <SearchListFocusTargetContext.Provider value={focusTargetContextValue}>
            {/* Where the page header scrolls away, the select-all bar scrolls with the rows too, rather than staying pinned above them. */}
            {!isUnderScrollAwayHeader && selectionTopBar}
            <AnimatedFlashListComponent
                data={data}
                renderItem={renderItemWithKeyboardFocus}
                keyExtractor={keyExtractor}
                onScroll={onScroll}
                showsVerticalScrollIndicator={false}
                ref={ref}
                extraData={extraData}
                onEndReached={onEndReached}
                onEndReachedThreshold={onEndReachedThreshold}
                ListHeaderComponent={isUnderScrollAwayHeader ? selectionTopBar : undefined}
                ListFooterComponent={ListFooterComponent}
                onViewableItemsChanged={onViewableItemsChanged}
                onLayout={handleLayout}
                onContentSizeChange={handleContentSizeChange}
                CellRendererComponent={CellRendererComponent}
                removeClippedSubviews
                drawDistance={250}
                {...tabRootScrollProps}
                maintainVisibleContentPosition={{disabled: true}}
                stickyHeaderIndices={stickyHeaderIndices}
                stickyHeaderConfig={stickyHeaderConfig}
                getItemType={getItemType}
                overrideItemLayout={overrideItemLayout}
                overrideProps={scrollLockStyle ? {style: scrollLockStyle} : undefined}
            />
        </SearchListFocusTargetContext.Provider>
    );
}

export default BaseSearchList;
