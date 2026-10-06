import type {ListScrollHandle} from '@components/FlashList/types';

import CONST from '@src/CONST';

import type {FlashListRef, ListRenderItemInfo, ViewToken} from '@shopify/flash-list';
import type {LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent} from 'react-native';

import React, {useImperativeHandle, useRef, useState} from 'react';

import type {RegularScrollTarget} from './listMirror';
import type InvertedFlashListProps from './types';

import FlashList from '..';
import createBottomAnchoredScrollComponent from './BottomAnchoredScrollView';
import CellRendererComponent from './CellRendererComponent';
import {
    mirrorIndex,
    mirrorViewToken,
    toInvertedScrollEvent,
    toRegularContentContainerStyle,
    toRegularInitialScroll,
    toRegularMaintainVisibleContentPosition,
    toRegularScrollTarget,
} from './listMirror';

/** Within this distance from the bottom the list follows new content, the same distance at which the report stops treating the user as reading history. */
const AUTOSCROLL_TO_BOTTOM_DISTANCE = CONST.REPORT.ACTIONS.ACTION_VISIBLE_THRESHOLD;

/**
 * Renders the list in the regular order instead of flipping it with a transform, so the platform keeps its native wheel,
 * touchpad, scroll chaining, scroll indicator and accessibility behavior. Callers keep the contract of an inverted list (the
 * newest item at index 0, the header at the visual bottom, offsets measured from the bottom), and this component translates
 * props, events and the ref.
 */
function InvertedFlashList<T>({
    ref,
    data,
    renderItem,
    keyExtractor,
    onViewableItemsChanged,
    onScroll,
    onLayout,
    onContentSizeChange,
    onEndReached,
    onEndReachedThreshold,
    onStartReached,
    onStartReachedThreshold,
    ListHeaderComponent,
    ListHeaderComponentStyle,
    ListFooterComponent,
    ListFooterComponentStyle,
    contentContainerStyle,
    initialScrollIndex,
    initialScrollIndexParams,
    maintainVisibleContentPosition,
    renderScrollComponent,
    ...restProps
}: InvertedFlashListProps<T>) {
    const listRef = useRef<FlashListRef<T>>(null);
    const [listHeight, setListHeight] = useState(0);
    const scrollMetricsRef = useRef({contentHeight: 0, layoutHeight: 0});
    const length = data.length;
    const bottomAnchoredScrollComponent = createBottomAnchoredScrollComponent(renderScrollComponent);
    const regularData = [...data].reverse();

    const scrollToRegularTarget = (target: RegularScrollTarget, animated: boolean | undefined) => {
        const list = listRef.current;
        if (!list) {
            return;
        }

        if (target.type === 'end') {
            list.scrollToEnd({animated});
            return;
        }

        if (target.type === 'start') {
            list.scrollToTop({animated});
            return;
        }

        list.scrollToIndex({index: target.index, viewPosition: target.viewPosition, viewOffset: target.viewOffset, animated});
    };

    useImperativeHandle(
        ref,
        (): ListScrollHandle => ({
            scrollToIndex: ({index, animated, viewPosition, viewOffset}) => {
                scrollToRegularTarget(toRegularScrollTarget({index, viewPosition, viewOffset}, length), animated ?? undefined);
            },
            scrollToEnd: (params) => {
                listRef.current?.scrollToTop({animated: params?.animated ?? undefined});
            },
            scrollToOffset: ({offset, animated}) => {
                const {contentHeight, layoutHeight} = scrollMetricsRef.current;
                listRef.current?.scrollToOffset({offset: Math.max(0, contentHeight - layoutHeight - offset), animated: animated ?? undefined});
            },
        }),
    );

    const initialTarget: RegularScrollTarget =
        initialScrollIndex === undefined || initialScrollIndex === null ? {type: 'end'} : toRegularScrollTarget({index: initialScrollIndex, ...initialScrollIndexParams}, length);
    const regularInitialScroll = toRegularInitialScroll(initialTarget, length);

    const handleLayout = (event: LayoutChangeEvent) => {
        const {height} = event.nativeEvent.layout;
        scrollMetricsRef.current.layoutHeight = height;
        setListHeight(height);
        onLayout?.(event);
    };

    const handleContentSizeChange = (width: number, height: number) => {
        scrollMetricsRef.current.contentHeight = height;
        onContentSizeChange?.(width, height);
    };

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const {contentSize, layoutMeasurement} = event.nativeEvent;
        scrollMetricsRef.current = {contentHeight: contentSize.height, layoutHeight: layoutMeasurement.height};
        onScroll?.(toInvertedScrollEvent(event));
    };

    const handleViewableItemsChanged = onViewableItemsChanged
        ? ({viewableItems, changed}: {viewableItems: Array<ViewToken<T>>; changed: Array<ViewToken<T>>}) => {
              onViewableItemsChanged({
                  viewableItems: viewableItems.map((token) => mirrorViewToken(token, length)),
                  changed: changed.map((token) => mirrorViewToken(token, length)),
              });
          }
        : onViewableItemsChanged;

    const renderRegularItem = renderItem ? (info: ListRenderItemInfo<T>) => renderItem({...info, index: mirrorIndex(info.index, length)}) : renderItem;

    // @components/FlashList forwards the ref to the Shopify list as an untyped runtime prop.
    const flashListProps = {...restProps, ref: listRef};

    return (
        <FlashList<T>
            {...flashListProps}
            isChatList
            data={regularData}
            renderItem={renderRegularItem}
            keyExtractor={(item, index) => keyExtractor(item, mirrorIndex(index, length))}
            onViewableItemsChanged={handleViewableItemsChanged}
            onScroll={handleScroll}
            onLayout={handleLayout}
            onContentSizeChange={handleContentSizeChange}
            onStartReached={onEndReached}
            onStartReachedThreshold={onEndReachedThreshold}
            onEndReached={onStartReached}
            onEndReachedThreshold={onStartReachedThreshold}
            ListHeaderComponent={ListFooterComponent}
            ListHeaderComponentStyle={ListFooterComponentStyle}
            ListFooterComponent={ListHeaderComponent}
            ListFooterComponentStyle={ListHeaderComponentStyle}
            contentContainerStyle={toRegularContentContainerStyle(contentContainerStyle)}
            initialScrollIndex={regularInitialScroll.initialScrollIndex}
            initialScrollIndexParams={regularInitialScroll.initialScrollIndexParams}
            maintainVisibleContentPosition={toRegularMaintainVisibleContentPosition(maintainVisibleContentPosition, listHeight > 0 ? AUTOSCROLL_TO_BOTTOM_DISTANCE / listHeight : 0)}
            CellRendererComponent={CellRendererComponent}
            renderScrollComponent={bottomAnchoredScrollComponent}
        />
    );
}

export default InvertedFlashList;
