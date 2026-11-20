import {renderHook} from '@testing-library/react-native';

import useSyncFocus from '@hooks/useSyncFocus/useSyncFocusImplementation';

import type {ComponentRef, RefObject} from 'react';
import type {View} from 'react-native';

import createMock from '../utils/createMock';

describe('useSyncFocus', () => {
    it('useSyncFocus should only focus if shouldSyncFocus is true', () => {
        const focusMock = jest.fn();
        const refMock: RefObject<ComponentRef<typeof View> | null> = {current: createMock<ComponentRef<typeof View>>({focus: focusMock})};

        // When useSyncFocus is rendered initially while shouldSyncFocus is false.
        const {rerender} = renderHook(
            ({ref = refMock, isFocused = true, shouldSyncFocus = false}: {isFocused?: boolean; shouldSyncFocus?: boolean; ref?: RefObject<ComponentRef<typeof View> | null>}) =>
                useSyncFocus(ref, isFocused, shouldSyncFocus),
            {initialProps: {}},
        );
        // Then the ref focus will not be called.
        expect(focusMock).not.toHaveBeenCalled();

        rerender({isFocused: false});
        expect(focusMock).not.toHaveBeenCalled();

        // When shouldSyncFocus and isFocused are true
        rerender({isFocused: true, shouldSyncFocus: true});

        // Then the ref focus will be called.
        expect(focusMock).toHaveBeenCalled();
    });

    it('blurs an element that loses focus while it still has browser focus, only when asked to', () => {
        // Given a focused list row that still has browser focus, like a list cell about to be reused for another item
        const element = document.createElement('button');
        document.body.appendChild(element);
        element.focus();
        const refMock = {current: element};
        const {rerender} = renderHook(
            ({isFocused, shouldBlurOnFocusLoss}: {isFocused: boolean; shouldBlurOnFocusLoss: boolean}) => useSyncFocus(refMock, isFocused, false, shouldBlurOnFocusLoss),
            {
                initialProps: {isFocused: true, shouldBlurOnFocusLoss: false},
            },
        );

        // When it loses focus without opting in
        rerender({isFocused: false, shouldBlurOnFocusLoss: false});

        // Then it keeps browser focus, as other lists expect
        expect(document.activeElement).toBe(element);

        // When it loses focus while opted in
        rerender({isFocused: true, shouldBlurOnFocusLoss: true});
        rerender({isFocused: false, shouldBlurOnFocusLoss: true});

        // Then browser focus leaves it, so its focus ring doesn't show on the next item it renders
        expect(document.activeElement).not.toBe(element);
        element.remove();
    });
});
