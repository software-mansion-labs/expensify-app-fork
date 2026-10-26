import {render} from '@testing-library/react-native';

import type {KeyCommandEvent} from '@libs/KeyboardShortcut/bindHandlerToKeydownEvent/types';
import {cancelPendingMfaMarkerReattach, popAndRealignMfaMarker} from '@libs/Navigation/helpers/mfaModalMarkerPreservation';
import Navigation from '@libs/Navigation/Navigation';

import EscapeHandler from '@navigation/AppNavigator/KeyboardShortcutsHandler/EscapeHandler';

import CONST from '@src/CONST';

import React from 'react';
import waitForBatchedUpdatesWithAct from 'tests/utils/waitForBatchedUpdatesWithAct';

type KeyCommandListener = (keyCommandEvent: KeyCommandEvent, event: KeyboardEvent) => void;

let mockRootState: {routes: Array<{name: string}>; history: unknown[]} = {routes: [], history: []};

// The KeyCommand mock is a no-op, so this captures the listeners `KeyboardShortcut` registers on import to drive a
// key press through its real handler stack. They live on the mock itself because the import runs before this file's body.
jest.mock('react-native-key-command', () => {
    const listeners: KeyCommandListener[] = [];
    return {
        constants: {},
        addListener: (_trigger: unknown, listener: KeyCommandListener) => {
            listeners.push(listener);
            return () => {};
        },
        listeners,
    };
});

jest.mock('@libs/Navigation/navigationRef', () => ({
    __esModule: true,
    default: {isReady: () => true, getRootState: () => mockRootState, dispatch: jest.fn()},
}));

jest.mock('@libs/Navigation/Navigation', () => ({
    __esModule: true,
    default: {dismissModal: jest.fn(), closeRHPFlow: jest.fn(), dismissToSuperWideRHP: jest.fn(), dismissToPreviousRHP: jest.fn()},
    navigationRef: {isReady: () => true, getRootState: () => mockRootState, dispatch: jest.fn()},
}));

const MFA_MARKER = CONST.NAVIGATION.CUSTOM_HISTORY_ENTRY_MFA_MODAL_NAVIGATOR;

function pressEscape() {
    const listener = jest.requireMock<{listeners: KeyCommandListener[]}>('react-native-key-command').listeners.at(0);
    if (!listener) {
        throw new Error('KeyboardShortcut registered no KeyCommand listener.');
    }
    listener({input: 'keyInputEscape'}, new KeyboardEvent('keydown', {key: 'Escape'}));
}

describe('EscapeHandler', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        // Given the app's Escape handler is mounted over a modal with no MFA marker in the history
        mockRootState = {routes: [{name: 'SomeModal'}], history: []};
        render(<EscapeHandler />);
        await waitForBatchedUpdatesWithAct();
    });

    afterEach(() => {
        cancelPendingMfaMarkerReattach();
    });

    it('dismisses the modal when the MFA modal is not open', () => {
        // When the user presses Escape
        pressEscape();

        // Then the modal is dismissed, because the MFA guard must not change Escape anywhere outside the MFA flow
        expect(Navigation.dismissModal).toHaveBeenCalledTimes(1);
    });

    it('ignores Escape while the MFA marker is in the root history', () => {
        // Given the MFA modal is open, which its marker in the root history signals
        mockRootState = {routes: [{name: 'SomeModal'}], history: ['SomeModal', MFA_MARKER]};

        // When the user presses Escape
        pressEscape();

        // Then nothing is dismissed, because the MFA modal handles Escape itself by asking the user to confirm the cancel
        expect(Navigation.dismissModal).not.toHaveBeenCalled();
    });

    it('ignores Escape while a goBack strips the MFA marker and has not re-attached it yet', () => {
        // Given the MFA modal is open and a goBack has stripped its marker but not re-attached it yet
        mockRootState = {routes: [{name: 'SomeModal'}], history: ['SomeModal', MFA_MARKER]};
        popAndRealignMfaMarker(
            () => {
                mockRootState = {routes: [{name: 'SomeModal'}], history: ['SomeModal']};
            },
            () => {},
        );

        // When the user presses Escape in that window
        pressEscape();

        // Then nothing is dismissed, because the MFA modal is still open even though its marker is briefly missing
        expect(Navigation.dismissModal).not.toHaveBeenCalled();
    });
});
