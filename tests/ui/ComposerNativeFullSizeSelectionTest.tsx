import {act, render} from '@testing-library/react-native';

import Composer from '@components/Composer/implementation/index.native';
import type {AnimatedMarkdownTextInputRef} from '@components/RNMarkdownTextInput';

import type {Ref} from 'react';

import React, {Activity, StrictMode} from 'react';

const mockSetSelection = jest.fn();

jest.mock('@components/RNMarkdownTextInput', () => {
    const ReactMock = jest.requireActual<typeof React>('react');
    return {
        __esModule: true,
        default: function MockRNMarkdownTextInput({ref}: {ref?: Ref<Partial<AnimatedMarkdownTextInputRef>>}) {
            ReactMock.useImperativeHandle(ref, () => ({setSelection: mockSetSelection}));
            return null;
        },
    };
});

const VALUE = 'Hello';
const SELECTION = {start: VALUE.length, end: VALUE.length};
const CARET_PLACEMENT_CALLS = [
    [VALUE.length - 1, VALUE.length],
    [VALUE.length, VALUE.length],
];

function runPendingTimers() {
    act(() => {
        jest.runOnlyPendingTimers();
    });
}

describe('native Composer caret placement on isComposerFullSize', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        mockSetSelection.mockClear();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('places the caret once on a StrictMode mount', () => {
        // Given a Composer mounted under StrictMode, which runs the effect, its cleanup and the effect again
        render(
            <StrictMode>
                <Composer
                    value={VALUE}
                    selection={SELECTION}
                />
            </StrictMode>,
        );

        // When the 0 ms timer fires
        runPendingTimers();

        // Then the mount caret placement is applied, because the strict cleanup cancelled the first timer before it ran
        expect(mockSetSelection.mock.calls).toEqual(CARET_PLACEMENT_CALLS);
    });

    it('places the caret again after a toggle back to the small size', () => {
        // Given a mounted Composer whose mount caret placement already ran
        const {rerender} = render(
            <Composer
                value={VALUE}
                selection={SELECTION}
            />,
        );
        runPendingTimers();
        mockSetSelection.mockClear();

        // When the composer goes full size and back to small
        rerender(
            <Composer
                value={VALUE}
                selection={SELECTION}
                isComposerFullSize
            />,
        );
        runPendingTimers();
        rerender(
            <Composer
                value={VALUE}
                selection={SELECTION}
            />,
        );
        runPendingTimers();

        // Then the caret is placed again to scroll to it in the smaller composer
        expect(mockSetSelection.mock.calls).toEqual(CARET_PLACEMENT_CALLS);
    });

    it('does not move the caret on a reveal when isComposerFullSize did not change', () => {
        // Given a Composer in a visible Activity whose mount caret placement already ran
        const {rerender} = render(
            <Activity mode="visible">
                <Composer
                    value={VALUE}
                    selection={SELECTION}
                />
            </Activity>,
        );
        runPendingTimers();
        mockSetSelection.mockClear();

        // When the Activity hides and reveals with the same isComposerFullSize
        rerender(
            <Activity mode="hidden">
                <Composer
                    value={VALUE}
                    selection={SELECTION}
                />
            </Activity>,
        );
        rerender(
            <Activity mode="visible">
                <Composer
                    value={VALUE}
                    selection={SELECTION}
                />
            </Activity>,
        );
        runPendingTimers();

        // Then the caret stays where the user left it
        expect(mockSetSelection).not.toHaveBeenCalled();
    });

    it('places the caret once when the Activity hides before the mount timer fires', () => {
        // Given a Composer in a visible Activity whose mount timer is still pending
        const {rerender} = render(
            <Activity mode="visible">
                <Composer
                    value={VALUE}
                    selection={SELECTION}
                />
            </Activity>,
        );

        // When the Activity hides inside the 0 ms window and reveals again
        rerender(
            <Activity mode="hidden">
                <Composer
                    value={VALUE}
                    selection={SELECTION}
                />
            </Activity>,
        );
        rerender(
            <Activity mode="visible">
                <Composer
                    value={VALUE}
                    selection={SELECTION}
                />
            </Activity>,
        );
        runPendingTimers();

        // Then the caret placement cancelled by the hide runs after the reveal
        expect(mockSetSelection.mock.calls).toEqual(CARET_PLACEMENT_CALLS);
    });
});
