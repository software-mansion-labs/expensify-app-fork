import {render, screen} from '@testing-library/react-native';

import Button from '@components/Button';
import ComposeProviders from '@components/ComposeProviders';
import FullScreenAmountLayout from '@components/FullScreenAmountLayout';
import {LocaleContextProvider} from '@components/LocaleContextProvider';
import NumericInput from '@components/NumericInput';
import OnyxListItemProvider from '@components/OnyxListItemProvider';

import type * as DeviceCapabilities from '@libs/DeviceCapabilities';

import type * as NativeNavigation from '@react-navigation/native';

import React from 'react';
import {StyleSheet} from 'react-native';

import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

// A portrait window, so the layout is a single column (the native isInLandscapeMode used by Jest only compares width and height)
jest.mock('@hooks/useWindowDimensions', () => () => ({windowWidth: 390, windowHeight: 844}));

jest.mock('@libs/DeviceCapabilities', () => ({
    ...jest.requireActual<typeof DeviceCapabilities>('@libs/DeviceCapabilities'),
    canUseTouchScreen: () => false,
}));

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<typeof NativeNavigation>('@react-navigation/native'),
    useIsFocused: jest.fn(() => true),
    useNavigation: jest.fn(() => ({
        navigate: jest.fn(),
        addListener: jest.fn(() => jest.fn()),
    })),
}));

const ROOT_TEST_ID = 'layout-root';
const PAD_TEST_ID = 'layout-pad';
const FOOTER_TEST_ID = 'layout-footer';

function renderLayout(hasFooter: boolean) {
    return render(
        <ComposeProviders components={[OnyxListItemProvider, LocaleContextProvider]}>
            <NumericInput value="12.5">
                <FullScreenAmountLayout testID={ROOT_TEST_ID}>
                    <FullScreenAmountLayout.Body>
                        <FullScreenAmountLayout.Main>
                            <NumericInput.Container>
                                <NumericInput.TextInput />
                            </NumericInput.Container>
                        </FullScreenAmountLayout.Main>
                        <FullScreenAmountLayout.Pad testID={PAD_TEST_ID}>
                            <NumericInput.BigNumberPad />
                        </FullScreenAmountLayout.Pad>
                    </FullScreenAmountLayout.Body>
                    {hasFooter && (
                        <FullScreenAmountLayout.Footer testID={FOOTER_TEST_ID}>
                            <Button onPress={jest.fn()}>Save</Button>
                        </FullScreenAmountLayout.Footer>
                    )}
                </FullScreenAmountLayout>
            </NumericInput>
        </ComposeProviders>,
    );
}

describe('FullScreenAmountLayout without touch screen', () => {
    it('lets the footer pad the bottom of the screen, since there is no number pad to end the body', async () => {
        // Given a device without a touch screen, where the number pad never renders
        // When the layout renders a footer
        renderLayout(true);
        await waitForBatchedUpdatesWithAct();

        // Then the pad leaves no empty container, and the centered footer owns the bottom spacing instead of the scroll view
        expect(screen.queryByTestId(PAD_TEST_ID)).toBeNull();
        expect(StyleSheet.flatten(screen.getByTestId(FOOTER_TEST_ID).props.style)).toMatchObject({alignItems: 'center', paddingBottom: 20});
        expect(StyleSheet.flatten(screen.getByTestId(ROOT_TEST_ID).props.contentContainerStyle)).not.toHaveProperty('paddingBottom');
    });

    it('adds no bottom spacing when neither a pad nor a footer ends the body', async () => {
        // Given a device without a touch screen and a screen whose submit button sits outside the layout (e.g. a FormProvider)
        // When the layout renders without a footer
        renderLayout(false);
        await waitForBatchedUpdatesWithAct();

        // Then nothing pads the bottom, so the centered amount keeps the full height of the column like the legacy form
        expect(screen.queryByTestId(PAD_TEST_ID)).toBeNull();
        expect(StyleSheet.flatten(screen.getByTestId(ROOT_TEST_ID).props.contentContainerStyle)).not.toHaveProperty('paddingBottom');
    });
});
