import {act, render} from '@testing-library/react-native';

import type * as WebComposerModule from '@components/Composer/implementation/index.tsx';
import type * as OnyxListItemProviderModule from '@components/OnyxListItemProvider';

import CONST from '@src/CONST';

import type * as NativeNavigation from '@react-navigation/native';
import type {Ref} from 'react';
import type {TextInput} from 'react-native';

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
        default: function MockRNMarkdownTextInput({ref, testID}: {ref?: Ref<HTMLDivElement>; testID?: string}) {
            ReactMock.useImperativeHandle(ref, () => mockComposerElement);
            return <MockTextInput testID={testID} />;
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
        mockComposerElement = document.createElement('div');
    });

    afterEach(() => {
        DeviceEventEmitter.removeAllListeners(CONST.EVENTS.SCROLLING);
        jest.useRealTimers();
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
    });
});
