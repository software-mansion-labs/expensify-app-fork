import type {ListScrollHandle} from '@components/FlashList/types';

import CONST from '@src/CONST';

import type {FlashListRef, ListRenderItemInfo, ViewToken} from '@shopify/flash-list';
import type {LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent} from 'react-native';

import React, {useImperativeHandle, useRef, useState} from 'react';

import type InvertedFlashListProps from './types';
import type {WebScrollTarget} from './webListMirror';

import FlashList from '..';
import CellRendererComponent from './CellRendererComponent';
import {mirrorIndex, mirrorViewToken, toInvertedScrollEvent, toWebContentContainerStyle, toWebInitialScroll, toWebMaintainVisibleContentPosition, toWebScrollTarget} from './webListMirror';

/** Within this distance from the bottom the list follows new content, the same distance at which the report stops treating the user as reading history. */
const AUTOSCROLL_TO_BOTTOM_DISTANCE = CONST.REPORT.ACTIONS.ACTION_VISIBLE_THRESHOLD;

/**
 * Web renders the list in the regular order instead of flipping it with a transform, so the browser keeps its native wheel,
 * touchpad and scroll chaining behavior. Callers keep the contract of the native inverted list (the newest item at index 0,
 * the header at the visual bottom, offsets measured from the bottom), and this component translates props, events and the ref.
 */
function InvertedFlashList<T>({
    ref,
    data,
    renderItem,
    keyExtractor,
    onViewableItemsChanged,
    onScroll,
    onLayout,
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
    ...restProps
}: InvertedFlashListProps<T>) {
    const listRef = useRef<FlashListRef<T>>(null);
    const [listHeight, setListHeight] = useState(0);
    const length = data.length;
    const webData = [...data].reverse();

    const scrollToWebTarget = (target: WebScrollTarget, animated: boolean | undefined) => {
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
                scrollToWebTarget(toWebScrollTarget({index, viewPosition, viewOffset}, length), animated ?? undefined);
            },
            scrollToEnd: (params) => {
                listRef.current?.scrollToTop({animated: params?.animated ?? undefined});
            },
            scrollToOffset: ({offset, animated}) => {
                const scrollableNode: unknown = listRef.current?.getScrollableNode();
                if (!(scrollableNode instanceof HTMLElement)) {
                    return;
                }

                const maxOffset = scrollableNode.scrollHeight - scrollableNode.clientHeight;
                listRef.current?.scrollToOffset({offset: Math.max(0, maxOffset - offset), animated: animated ?? undefined});
            },
        }),
    );

    const initialTarget: WebScrollTarget =
        initialScrollIndex === undefined || initialScrollIndex === null ? {type: 'end'} : toWebScrollTarget({index: initialScrollIndex, ...initialScrollIndexParams}, length);
    const webInitialScroll = toWebInitialScroll(initialTarget, length);

    const handleLayout = (event: LayoutChangeEvent) => {
        setListHeight(event.nativeEvent.layout.height);
        onLayout?.(event);
    };

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
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

    const renderWebItem = renderItem ? (info: ListRenderItemInfo<T>) => renderItem({...info, index: mirrorIndex(info.index, length)}) : renderItem;

    // @components/FlashList forwards the ref to the Shopify list as an untyped runtime prop, like the native variant does.
    const flashListProps = {...restProps, ref: listRef};

    return (
        <FlashList<T>
            {...flashListProps}
            isChatList
            data={webData}
            renderItem={renderWebItem}
            keyExtractor={(item, index) => keyExtractor(item, mirrorIndex(index, length))}
            onViewableItemsChanged={handleViewableItemsChanged}
            onScroll={handleScroll}
            onLayout={handleLayout}
            onStartReached={onEndReached}
            onStartReachedThreshold={onEndReachedThreshold}
            onEndReached={onStartReached}
            onEndReachedThreshold={onStartReachedThreshold}
            ListHeaderComponent={ListFooterComponent}
            ListHeaderComponentStyle={ListFooterComponentStyle}
            ListFooterComponent={ListHeaderComponent}
            ListFooterComponentStyle={ListHeaderComponentStyle}
            contentContainerStyle={toWebContentContainerStyle(contentContainerStyle)}
            initialScrollIndex={webInitialScroll.initialScrollIndex}
            initialScrollIndexParams={webInitialScroll.initialScrollIndexParams}
            maintainVisibleContentPosition={toWebMaintainVisibleContentPosition(maintainVisibleContentPosition, listHeight > 0 ? AUTOSCROLL_TO_BOTTOM_DISTANCE / listHeight : 0)}
            CellRendererComponent={CellRendererComponent}
        />
    );
}

export default InvertedFlashList;
