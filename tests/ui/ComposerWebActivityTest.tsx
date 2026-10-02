import {act, fireEvent, render, screen} from '@testing-library/react-native';

import type * as WebComposerModule from '@components/Composer/implementation/index.tsx';
import type * as OnyxListItemProviderModule from '@components/OnyxListItemProvider';

import CONST from '@src/CONST';

import type * as NativeNavigation from '@react-navigation/native';
import type {Ref} from 'react';
import type {TextInput, TextInputProps} from 'react-native';

import React, {Activity} from 'react';
import {DeviceEventEmitter} from 'react-native';

// The explicit extension skips the jest platform resolution, which picks index.native.tsx for a bare path.
const {default: Composer} = jest.requireActual<typeof WebComposerModule>('@components/Composer/implementation/index.tsx');

let mockComposerElement = document.createElement('div');

jest.mock('@components/RNMarkdownTextInput', () => {
    const ReactMock = jest.requireActual<typeof React>('react');
    const {TextInput: MockTextInput} = jest.requireActual<{TextInput: typeof TextInput}>('react-native');
    return {
        __esModule: true,
        default: function MockRNMarkdownTextInput({
            ref,
            testID,
            onContentSizeChange,
        }: {
            ref?: Ref<HTMLDivElement>;
            testID?: string;
            onContentSizeChange?: TextInputProps['onContentSizeChange'];
        }) {
            ReactMock.useImperativeHandle(ref, () => mockComposerElement);
            return (
                <MockTextInput
                    testID={testID}
                    onContentSizeChange={onContentSizeChange}
                />
            );
        },
    };
});

jest.mock('@components/OnyxListItemProvider', () => ({
    ...jest.requireActual<typeof OnyxListItemProviderModule>('@components/OnyxListItemProvider'),
    useSession: () => undefined,
}));

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<typeof NativeNavigation>('@react-navigation/native'),
    useIsFocused: () => true,
}));

const COMPOSER_TEST_ID = 'webComposer';

// Matches the debounce of the Composer scroll listener that records prevScroll.
const SCROLL_DEBOUNCE_MS = 100;

const CONTENT_HEIGHT = 1000;
const SMALL_CLIENT_HEIGHT = 200;
const FULL_SIZE_CLIENT_HEIGHT = 600;
const SCROLL_BEFORE_EXPAND = 120;
const RESTORED_SCROLL = SCROLL_BEFORE_EXPAND + CONTENT_HEIGHT - FULL_SIZE_CLIENT_HEIGHT;
const USER_SCROLL_IN_FULL_SIZE = 300;

function createComposerElement() {
    const element = document.createElement('div');
    Object.defineProperties(element, {
        scrollTop: {value: 0, writable: true, configurable: true},
        scrollHeight: {value: CONTENT_HEIGHT, configurable: true},
        clientHeight: {value: SMALL_CLIENT_HEIGHT, configurable: true},
    });
    return element;
}

function resizeComposer(clientHeight: number) {
    Object.defineProperty(mockComposerElement, 'clientHeight', {value: clientHeight, configurable: true});
}

function reportContentHeight(height: number) {
    fireEvent(screen.getByTestId(COMPOSER_TEST_ID), 'contentSizeChange', {nativeEvent: {contentSize: {width: 0, height}}});
}

function scrollComposerTo(scrollTop: number) {
    mockComposerElement.scrollTop = scrollTop;
    act(() => {
        mockComposerElement.dispatchEvent(new Event('scroll'));
        jest.advanceTimersByTime(SCROLL_DEBOUNCE_MS);
    });
}

function emitReportListScrolling(isScrolling: boolean) {
    act(() => {
        DeviceEventEmitter.emit(CONST.EVENTS.SCROLLING, isScrolling);
    });
}

function isWheelBlocked() {
    const wheelEvent = new Event('wheel', {cancelable: true});
    mockComposerElement.dispatchEvent(wheelEvent);
    return wheelEvent.defaultPrevented;
}

describe('web Composer across Activity hide and reveal', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        mockComposerElement = createComposerElement();
    });

    afterEach(() => {
        DeviceEventEmitter.removeAllListeners(CONST.EVENTS.SCROLLING);
        jest.useRealTimers();
    });

    describe('scroll restore on isComposerFullSize', () => {
        it('restores the scroll position when a visible composer enters full size', () => {
            // Given a visible small composer that recorded its content height and scroll position
            const {rerender} = render(
                <Activity mode="visible">
                    <Composer testID={COMPOSER_TEST_ID} />
                </Activity>,
            );
            reportContentHeight(CONTENT_HEIGHT);
            scrollComposerTo(SCROLL_BEFORE_EXPAND);

            // When the composer grows to full size
            resizeComposer(FULL_SIZE_CLIENT_HEIGHT);
            rerender(
                <Activity mode="visible">
                    <Composer
                        testID={COMPOSER_TEST_ID}
                        isComposerFullSize
                    />
                </Activity>,
            );

            // Then the scroll is moved so the same content stays in view, which is the live behavior the fix keeps
            expect(mockComposerElement.scrollTop).toBe(RESTORED_SCROLL);
        });

        it('keeps the scroll position on a reveal with an unchanged isComposerFullSize', () => {
            // Given a full-size composer that restored its scroll on the toggle and was then scrolled by the user
            const {rerender} = render(
                <Activity mode="visible">
                    <Composer testID={COMPOSER_TEST_ID} />
                </Activity>,
            );
            reportContentHeight(CONTENT_HEIGHT);
            scrollComposerTo(SCROLL_BEFORE_EXPAND);
            resizeComposer(FULL_SIZE_CLIENT_HEIGHT);
            rerender(
                <Activity mode="visible">
                    <Composer
                        testID={COMPOSER_TEST_ID}
                        isComposerFullSize
                    />
                </Activity>,
            );
            scrollComposerTo(USER_SCROLL_IN_FULL_SIZE);

            // When the screen is hidden and revealed, which re-runs the effect with the same isComposerFullSize
            rerender(
                <Activity mode="hidden">
                    <Composer
                        testID={COMPOSER_TEST_ID}
                        isComposerFullSize
                    />
                </Activity>,
            );
            rerender(
                <Activity mode="visible">
                    <Composer
                        testID={COMPOSER_TEST_ID}
                        isComposerFullSize
                    />
                </Activity>,
            );

            // Then the user's scroll position stays, as it does on a composer that never left the screen
            expect(mockComposerElement.scrollTop).toBe(USER_SCROLL_IN_FULL_SIZE);
        });

        it('restores the scroll position on reveal when the composer entered full size while hidden', () => {
            // Given a visible small composer that recorded its content height and scroll position
            const {rerender} = render(
                <Activity mode="visible">
                    <Composer testID={COMPOSER_TEST_ID} />
                </Activity>,
            );
            reportContentHeight(CONTENT_HEIGHT);
            scrollComposerTo(SCROLL_BEFORE_EXPAND);

            // When the composer goes full size while hidden and is revealed
            rerender(
                <Activity mode="hidden">
                    <Composer testID={COMPOSER_TEST_ID} />
                </Activity>,
            );
            rerender(
                <Activity mode="hidden">
                    <Composer
                        testID={COMPOSER_TEST_ID}
                        isComposerFullSize
                    />
                </Activity>,
            );
            resizeComposer(FULL_SIZE_CLIENT_HEIGHT);
            rerender(
                <Activity mode="visible">
                    <Composer
                        testID={COMPOSER_TEST_ID}
                        isComposerFullSize
                    />
                </Activity>,
            );

            // Then the real change is still applied once on reveal, so the skip covers only unchanged values
            expect(mockComposerElement.scrollTop).toBe(RESTORED_SCROLL);
        });
    });

    describe('wheel blocking while the report list scrolls', () => {
        it('blocks wheel events while the report list scrolls and releases them when it stops', () => {
            // Given a visible composer
            render(
                <Activity mode="visible">
                    <Composer testID={COMPOSER_TEST_ID} />
                </Activity>,
            );

            // When the report list starts scrolling
            emitReportListScrolling(true);

            // Then wheel events over the composer are blocked, which is the live behavior the fix keeps
            expect(isWheelBlocked()).toBe(true);

            // When the report list stops scrolling
            emitReportListScrolling(false);

            // Then wheel events pass again
            expect(isWheelBlocked()).toBe(false);
        });

        it('releases wheel events on reveal when the list stopped scrolling while hidden', () => {
            // Given a visible composer whose report list is scrolling
            const {rerender} = render(
                <Activity mode="visible">
                    <Composer testID={COMPOSER_TEST_ID} />
                </Activity>,
            );
            emitReportListScrolling(true);

            // When the screen is hidden, the list stops while the listener is gone, and the screen is revealed
            rerender(
                <Activity mode="hidden">
                    <Composer testID={COMPOSER_TEST_ID} />
                </Activity>,
            );
            emitReportListScrolling(false);
            rerender(
                <Activity mode="visible">
                    <Composer testID={COMPOSER_TEST_ID} />
                </Activity>,
            );

            // Then wheel events pass, as they do on a composer that heard the stop event
            expect(isWheelBlocked()).toBe(false);
        });

        it('blocks wheel events again when the report list scrolls after a reveal', () => {
            // Given a composer that was hidden while its report list was scrolling and then revealed
            const {rerender} = render(
                <Activity mode="visible">
                    <Composer testID={COMPOSER_TEST_ID} />
                </Activity>,
            );
            emitReportListScrolling(true);
            rerender(
                <Activity mode="hidden">
                    <Composer testID={COMPOSER_TEST_ID} />
                </Activity>,
            );
            rerender(
                <Activity mode="visible">
                    <Composer testID={COMPOSER_TEST_ID} />
                </Activity>,
            );

            // When the report list scrolls again
            emitReportListScrolling(true);

            // Then wheel events are blocked, so the reveal resubscribed to the scrolling event
            expect(isWheelBlocked()).toBe(true);
        });
    });
});
