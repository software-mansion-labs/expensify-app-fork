import {fireEvent, render, screen} from '@testing-library/react-native';

import ComposeProviders from '@components/ComposeProviders';
import {LocaleContextProvider} from '@components/LocaleContextProvider';
import NumericInput from '@components/NumericInput';
import OnyxListItemProvider from '@components/OnyxListItemProvider';

import type * as DeviceCapabilities from '@libs/DeviceCapabilities';

import type * as NativeNavigation from '@react-navigation/native';

import React from 'react';

import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

const PORTRAIT_PHONE = {windowWidth: 390, windowHeight: 844};
const LANDSCAPE_PHONE = {windowWidth: 844, windowHeight: 390};

// The real useIsInLandscapeMode runs on top of these dimensions, and the device info mock reports a phone (not a tablet)
const mockWindowDimensions = jest.fn(() => PORTRAIT_PHONE);

jest.mock('@hooks/useWindowDimensions', () => () => mockWindowDimensions());

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

const INPUT_TEST_ID = 'numeric-text-input';

function renderWithProviders(children: React.ReactNode) {
    return render(<ComposeProviders components={[OnyxListItemProvider, LocaleContextProvider]}>{children}</ComposeProviders>);
}

describe('NumericInput layout composition without touch screen', () => {
    beforeEach(() => {
        mockWindowDimensions.mockReturnValue(PORTRAIT_PHONE);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it.each([
        ['portrait', PORTRAIT_PHONE],
        ['landscape', LANDSCAPE_PHONE],
    ])('renders action inside NumericInput.Container in non-touch mode in %s', async (_orientation, windowDimensions) => {
        // Given an input in non-touch mode with a currency button passed via the action prop of NumericInput.Container, in
        // either orientation, since the container itself does not depend on it
        mockWindowDimensions.mockReturnValue(windowDimensions);
        const onCurrencyPress = jest.fn();
        renderWithProviders(
            <NumericInput
                value="100"
                errorText="Test error"
            >
                <NumericInput.Container
                    action={
                        <NumericInput.CurrencyButton
                            currency="USD"
                            onPress={onCurrencyPress}
                        />
                    }
                    testID="numeric-container"
                >
                    <NumericInput.TextInput testID={INPUT_TEST_ID} />
                    <NumericInput.Symbol>$</NumericInput.Symbol>
                </NumericInput.Container>
                <NumericInput.Error />
            </NumericInput>,
        );
        await waitForBatchedUpdatesWithAct();

        // When inspecting the container and the currency button
        const container = screen.getByTestId('numeric-container');
        const currencyButton = screen.getByText('USD');

        // Then the currency button is rendered inside the centered amount container alongside the input, with the error shown too
        expect(currencyButton).toBeOnTheScreen();
        expect(container).toContainElement(currencyButton);
        expect(screen.getByTestId(INPUT_TEST_ID)).toBeOnTheScreen();
        expect(screen.getByText('Test error')).toBeOnTheScreen();

        // And pressing the currency button triggers the press handler
        fireEvent.press(currencyButton);
        expect(onCurrencyPress).toHaveBeenCalledTimes(1);
    });

    it('renders NumericInput.Actions even when its only child renders nothing, leaving visibility to the composition', async () => {
        // Given an actions row whose only child is the flip button, which renders nothing without a touch screen
        renderWithProviders(
            <NumericInput
                value="100"
                allowNegative
            >
                <NumericInput.Actions testID="actions-container">
                    <NumericInput.FlipButton />
                </NumericInput.Actions>
            </NumericInput>,
        );
        await waitForBatchedUpdatesWithAct();

        // Then the row itself still renders, because it never inspects its children: a screen that shows no action
        // on this device simply does not render the row
        expect(screen.getByTestId('actions-container')).toBeOnTheScreen();
        expect(screen.queryByText('Flip')).toBeNull();
    });
});
