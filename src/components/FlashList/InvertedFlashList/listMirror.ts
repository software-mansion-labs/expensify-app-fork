import type {FlashListProps, ViewToken} from '@shopify/flash-list';
import type {NativeScrollEvent, StyleProp, ViewStyle} from 'react-native';

import {StyleSheet} from 'react-native';

type MaintainVisibleContentPosition = FlashListProps<unknown>['maintainVisibleContentPosition'];

type ScrollTargetRequest = {
    index: number;
    viewPosition?: number;
    viewOffset?: number;
};

type RegularScrollTarget = {type: 'start'} | {type: 'end'} | {type: 'index'; index: number; viewPosition: number; viewOffset: number};

type RegularInitialScroll = {
    initialScrollIndex?: number;
    initialScrollIndexParams?: {viewPosition: number; viewOffset?: number};
};

/** Maps an index between the inverted order (newest first) and the rendered order (oldest first). The mapping is its own inverse. */
function mirrorIndex(index: number, length: number): number {
    return length - 1 - index;
}

function mirrorViewToken<T>(token: ViewToken<T>, length: number): ViewToken<T> {
    return {...token, index: token.index === null ? null : mirrorIndex(token.index, length)};
}

/**
 * Translates an inverted scroll request into the rendered list. In the inverted list viewPosition 0 is the visual bottom and a
 * positive viewOffset moves the viewport towards older items, so both flip.
 */
function toRegularScrollTarget({index, viewPosition = 0, viewOffset = 0}: ScrollTargetRequest, length: number): RegularScrollTarget {
    const regularIndex = mirrorIndex(index, length);
    const regularViewPosition = 1 - viewPosition;
    const regularViewOffset = -viewOffset;

    // The newest item resting on the bottom edge is the end of the list; scrollToEnd also reveals the footer below it.
    if (regularIndex === length - 1 && regularViewPosition === 1 && regularViewOffset === 0) {
        return {type: 'end'};
    }

    // Any position at or above the oldest item clamps to the top of the content, header included.
    if (regularIndex === 0 && regularViewPosition >= 0 && regularViewOffset <= 0) {
        return {type: 'start'};
    }

    return {type: 'index', index: regularIndex, viewPosition: regularViewPosition, viewOffset: regularViewOffset};
}

/** Without an explicit target the inverted list opens at its newest item, so the rendered list starts at its last one. */
function toRegularInitialScroll(target: RegularScrollTarget, length: number): RegularInitialScroll {
    if (target.type === 'start' || length === 0) {
        return {};
    }

    if (target.type === 'end') {
        return {initialScrollIndex: length - 1, initialScrollIndexParams: {viewPosition: 1}};
    }

    return {initialScrollIndex: target.index, initialScrollIndexParams: {viewPosition: target.viewPosition, viewOffset: target.viewOffset}};
}

function mirrorJustifyContent(justifyContent: ViewStyle['justifyContent']): ViewStyle['justifyContent'] {
    if (justifyContent === 'flex-start') {
        return 'flex-end';
    }

    if (justifyContent === 'flex-end') {
        return 'flex-start';
    }

    return justifyContent;
}

/** Swaps the vertical paddings and the main axis alignment, and keeps short content at the bottom like the inverted list does. */
function toRegularContentContainerStyle(style: StyleProp<ViewStyle>): ViewStyle {
    const {paddingTop, paddingBottom, justifyContent = 'flex-start', ...restStyle} = StyleSheet.flatten([style]);

    return {
        ...restStyle,
        flexGrow: 1,
        paddingTop: paddingBottom,
        paddingBottom: paddingTop,
        justifyContent: mirrorJustifyContent(justifyContent),
    };
}

/**
 * The rendered list keeps the visible items in place when older items are prepended above them, and follows new content at the
 * bottom while the user is near it. An inverted list asked to autoscroll is pinned to its visual top instead, which in the
 * rendered list is offset 0, where a list without position maintenance already stays.
 */
function toRegularMaintainVisibleContentPosition(config: MaintainVisibleContentPosition, autoscrollToBottomThreshold: number): MaintainVisibleContentPosition {
    if ((config?.autoscrollToBottomThreshold ?? 0) > 0) {
        return {disabled: true};
    }

    return {disabled: false, autoscrollToBottomThreshold, animateAutoScrollToBottom: false};
}

/** Reports the scroll position as the distance from the bottom, which is the offset an inverted list reports. */
function toInvertedScrollEvent<TEvent extends {nativeEvent: NativeScrollEvent}>(event: TEvent): TEvent {
    const {contentOffset, contentSize, layoutMeasurement} = event.nativeEvent;

    return {
        ...event,
        nativeEvent: {
            ...event.nativeEvent,
            contentOffset: {...contentOffset, y: Math.max(0, contentSize.height - layoutMeasurement.height - contentOffset.y)},
        },
    };
}

export {mirrorIndex, mirrorViewToken, toRegularScrollTarget, toRegularInitialScroll, toRegularContentContainerStyle, toRegularMaintainVisibleContentPosition, toInvertedScrollEvent};
export type {RegularScrollTarget};
