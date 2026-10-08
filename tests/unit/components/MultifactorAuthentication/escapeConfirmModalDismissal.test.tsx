import {render} from '@testing-library/react-native';

import ReanimatedModal from '@components/Modal/ReanimatedModal';
import type suppressNextEscapeKeyupType from '@components/MultifactorAuthentication/useMFACancelOnEscape/suppressNextEscapeKeyup';

import React from 'react';
import {View} from 'react-native';

// The modal closes on an Escape `keyup` only on web.
jest.mock('@libs/getPlatform', () => ({
    __esModule: true,
    default: () => 'web',
}));

// Jest resolves the native variant by default, so the web variant is loaded by its explicit file name.
const suppressNextEscapeKeyup = jest.requireActual<{default: typeof suppressNextEscapeKeyupType}>(
    '@components/MultifactorAuthentication/useMFACancelOnEscape/suppressNextEscapeKeyup/index.ts',
).default;

function releaseEscape() {
    document.body.dispatchEvent(new KeyboardEvent('keyup', {key: 'Escape', bubbles: true, cancelable: true}));
}

// The MFA UI suites mock the modal shell, so this pins the real modal's half of the Escape contract:
// the press that opens the cancel confirmation must not close it, and the next press must.
describe('Escape against the real cancel-confirmation modal', () => {
    it('keeps the modal up on the opening release and dismisses it on the next press', () => {
        const onBackButtonPress = jest.fn();

        // The MFA shortcut's keydown arms the suppression, held long enough to repeat, and opens the modal.
        suppressNextEscapeKeyup();
        suppressNextEscapeKeyup();
        render(
            <ReanimatedModal
                isVisible
                onBackButtonPress={onBackButtonPress}
                // Required by the props type; `BaseModal` passes the same default.
                swipeThreshold={150}
            >
                <View />
            </ReanimatedModal>,
        );

        releaseEscape();
        expect(onBackButtonPress).not.toHaveBeenCalled();

        // While the modal is up the MFA shortcut is inactive, so the next press arms nothing.
        releaseEscape();
        expect(onBackButtonPress).toHaveBeenCalledTimes(1);
    });
});
