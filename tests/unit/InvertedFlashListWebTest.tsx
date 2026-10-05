import {render, screen} from '@testing-library/react-native';

import type InvertedFlashListWeb from '@components/FlashList/InvertedFlashList';
import {
    mirrorViewToken,
    toInvertedScrollEvent,
    toWebContentContainerStyle,
    toWebInitialScroll,
    toWebMaintainVisibleContentPosition,
    toWebScrollTarget,
} from '@components/FlashList/InvertedFlashList/webListMirror';

import type {ViewToken} from '@shopify/flash-list';
import type {NativeScrollEvent} from 'react-native';

import {FlashList as ShopifyFlashList} from '@shopify/flash-list';
import React from 'react';
import {View} from 'react-native';

type Message = {id: string};

// Jest resolves the native variant by default, so the web adapter is loaded by its file name.
const InvertedFlashList = jest.requireActual<{default: typeof InvertedFlashListWeb}>('@components/FlashList/InvertedFlashList/index.tsx').default;

const LENGTH = 10;

function buildScrollEvent(offsetY: number): {nativeEvent: NativeScrollEvent} {
    return {
        nativeEvent: {
            contentOffset: {x: 0, y: offsetY},
            contentSize: {width: 300, height: 2000},
            layoutMeasurement: {width: 300, height: 500},
            contentInset: {top: 0, left: 0, bottom: 0, right: 0},
            zoomScale: 1,
        },
    };
}

describe('toWebScrollTarget', () => {
    it('maps the newest item without positioning params to the end of the list', () => {
        expect(toWebScrollTarget({index: 0}, LENGTH)).toEqual({type: 'end'});
    });

    it('maps a linked message pinned to the visual top to the mirrored index pinned to the top', () => {
        expect(toWebScrollTarget({index: 3, viewPosition: 1, viewOffset: 40}, LENGTH)).toEqual({type: 'index', index: 6, viewPosition: 0, viewOffset: -40});
    });

    it('maps an item resting on the visual bottom to the mirrored index resting on the bottom', () => {
        expect(toWebScrollTarget({index: 4}, LENGTH)).toEqual({type: 'index', index: 5, viewPosition: 1, viewOffset: -0});
    });

    it('maps a position beyond the oldest item to the top of the list', () => {
        expect(toWebScrollTarget({index: LENGTH - 1, viewOffset: 900}, LENGTH)).toEqual({type: 'start'});
    });
});

describe('toWebInitialScroll', () => {
    it('starts at the last web item when the inverted list has no initial target', () => {
        expect(toWebInitialScroll({type: 'end'}, LENGTH)).toEqual({initialScrollIndex: LENGTH - 1, initialScrollIndexParams: {viewPosition: 1}});
    });

    it('leaves the list at the top when the target is the top', () => {
        expect(toWebInitialScroll({type: 'start'}, LENGTH)).toEqual({});
    });

    it('passes an explicit target through', () => {
        expect(toWebInitialScroll({type: 'index', index: 6, viewPosition: 0, viewOffset: -40}, LENGTH)).toEqual({
            initialScrollIndex: 6,
            initialScrollIndexParams: {viewPosition: 0, viewOffset: -40},
        });
    });
});

describe('toWebContentContainerStyle', () => {
    it('swaps the vertical paddings and mirrors the alignment', () => {
        expect(toWebContentContainerStyle({flexGrow: 1, justifyContent: 'flex-start', paddingBottom: 16})).toEqual({
            flexGrow: 1,
            justifyContent: 'flex-end',
            paddingTop: 16,
            paddingBottom: undefined,
        });
    });

    it('keeps short content at the bottom without an explicit alignment', () => {
        expect(toWebContentContainerStyle(undefined)).toEqual({flexGrow: 1, justifyContent: 'flex-end', paddingTop: undefined, paddingBottom: undefined});
    });
});

describe('toWebMaintainVisibleContentPosition', () => {
    it('keeps the position and follows the bottom when the inverted list does not autoscroll', () => {
        expect(toWebMaintainVisibleContentPosition({disabled: true}, 0.5)).toEqual({disabled: false, autoscrollToBottomThreshold: 0.5, animateAutoScrollToBottom: false});
    });

    it('stays at the top while the inverted list scrolls itself to its visual top', () => {
        expect(toWebMaintainVisibleContentPosition({disabled: false, autoscrollToBottomThreshold: 250}, 0.5)).toEqual({disabled: true});
    });

    it('returns to position maintenance once the inverted list stops scrolling itself', () => {
        expect(toWebMaintainVisibleContentPosition({disabled: false, autoscrollToBottomThreshold: 0}, 0.5)).toEqual({
            disabled: false,
            autoscrollToBottomThreshold: 0.5,
            animateAutoScrollToBottom: false,
        });
    });
});

describe('toInvertedScrollEvent', () => {
    it('reports the distance from the bottom', () => {
        expect(toInvertedScrollEvent(buildScrollEvent(1200)).nativeEvent.contentOffset.y).toBe(300);
    });

    it('reports zero at the bottom', () => {
        expect(toInvertedScrollEvent(buildScrollEvent(1500)).nativeEvent.contentOffset.y).toBe(0);
    });
});

describe('mirrorViewToken', () => {
    it('mirrors the index and keeps a missing index', () => {
        const token: ViewToken<Message> = {item: {id: 'a'}, key: 'a', index: 2, isViewable: true, timestamp: 0};
        expect(mirrorViewToken(token, LENGTH).index).toBe(7);
        expect(mirrorViewToken({...token, index: null}, LENGTH).index).toBeNull();
    });
});

describe('InvertedFlashList on web', () => {
    it('renders the oldest item first and hands callers the inverted index', () => {
        const newestFirst: Message[] = [{id: 'newest'}, {id: 'middle'}, {id: 'oldest'}];

        render(
            <InvertedFlashList<Message>
                ref={null}
                data={newestFirst}
                keyExtractor={(item) => item.id}
                renderItem={({item, index}) => (
                    <View
                        testID={`message-${index}`}
                        accessibilityLabel={item.id}
                    />
                )}
            />,
        );

        expect(screen.UNSAFE_getByType(ShopifyFlashList).props.data).toEqual([{id: 'oldest'}, {id: 'middle'}, {id: 'newest'}]);
        expect(screen.getByTestId('message-0')).toHaveProp('accessibilityLabel', 'newest');
        expect(screen.getByTestId('message-2')).toHaveProp('accessibilityLabel', 'oldest');
    });
});
