import {fireEvent, render, screen} from '@testing-library/react-native';

import Button from '@components/Button';
import ComposeProviders from '@components/ComposeProviders';
import {LocaleContextProvider} from '@components/LocaleContextProvider';
import NumericInput from '@components/NumericInput';
import OnyxListItemProvider from '@components/OnyxListItemProvider';

import type * as DeviceCapabilities from '@libs/DeviceCapabilities';

import type * as NativeNavigation from '@react-navigation/native';

import React from 'react';

import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

const mockIsInLandscapeMode = jest.fn(() => false);

jest.mock('@hooks/useResponsiveLayout', () => () => ({
    isInLandscapeMode: mockIsInLandscapeMode(),
    shouldUseNarrowLayout: true,
    isExtraSmallScreenHeight: false,
    isSmallScreenWidth: true,
    isMediumScreenWidth: false,
    isLargeScreenWidth: false,
    isExtraLargeScreenWidth: false,
    isExtraSmallScreenWidth: false,
    isSmallScreen: true,
    isInNarrowPaneModal: false,
    onboardingIsMediumOrLargerScreenWidth: false,
}));

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
const FOOTER_TEST_ID = 'numeric-footer-button';

function renderWithProviders(children: React.ReactNode) {
    return render(<ComposeProviders components={[OnyxListItemProvider, LocaleContextProvider]}>{children}</ComposeProviders>);
}

describe('NumericInput layout composition without touch screen', () => {
    beforeEach(() => {
        mockIsInLandscapeMode.mockReturnValue(false);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders portrait non-touch layout without number pad and keeps footer at bottom', async () => {
        // Given an input composed in portrait mode on a non-touch device
        renderWithProviders(
            <NumericInput
                value="100"
                allowNegative
                errorText="Non-touch error"
            >
                <NumericInput.ResponsiveLayout
                    currencyButton={
                        <NumericInput.CurrencyButton
                            currency="USD"
                            onPress={jest.fn()}
                        />
                    }
                    flipButton={<NumericInput.FlipButton />}
                    pad={<NumericInput.BigNumberPad />}
                    footer={
                        <Button
                            testID={FOOTER_TEST_ID}
                            onPress={jest.fn()}
                        >
                            Next
                        </Button>
                    }
                >
                    <NumericInput.AmountRow
                        testID={INPUT_TEST_ID}
                        symbol="$"
                    />
                </NumericInput.ResponsiveLayout>
            </NumericInput>,
        );
        await waitForBatchedUpdatesWithAct();

        // When examining the screen elements
        // Then the text input, currency button, error, and footer are displayed, while the layout leaves out the touch-only flip button and pad
        expect(screen.getByTestId(INPUT_TEST_ID)).toBeOnTheScreen();
        expect(screen.getByText('USD')).toBeOnTheScreen();
        expect(screen.queryByText('Flip')).toBeNull();
        expect(screen.queryByTestId('button_1')).toBeNull();
        expect(screen.getByText('Non-touch error')).toBeOnTheScreen();
        expect(screen.getByTestId(FOOTER_TEST_ID)).toBeOnTheScreen();
    });

    it('renders landscape non-touch layout with left column and no right column pad', async () => {
        // Given an input composed in landscape mode on a non-touch device
        mockIsInLandscapeMode.mockReturnValue(true);

        renderWithProviders(
            <NumericInput
                value="200"
                allowNegative
            >
                <NumericInput.ResponsiveLayout
                    currencyButton={
                        <NumericInput.CurrencyButton
                            currency="USD"
                            onPress={jest.fn()}
                        />
                    }
                    flipButton={<NumericInput.FlipButton />}
                    pad={<NumericInput.BigNumberPad />}
                    footer={
                        <Button
                            testID={FOOTER_TEST_ID}
                            onPress={jest.fn()}
                        >
                            Save
                        </Button>
                    }
                >
                    <NumericInput.AmountRow
                        testID={INPUT_TEST_ID}
                        symbol="$"
                    />
                </NumericInput.ResponsiveLayout>
            </NumericInput>,
        );
        await waitForBatchedUpdatesWithAct();

        // When examining the screen elements
        // Then the text input, currency button, and footer are visible, while touch-only elements are not rendered
        expect(screen.getByTestId(INPUT_TEST_ID)).toBeOnTheScreen();
        expect(screen.getByText('USD')).toBeOnTheScreen();
        expect(screen.queryByText('Flip')).toBeNull();
        expect(screen.queryByTestId('button_1')).toBeNull();
        expect(screen.getByTestId(FOOTER_TEST_ID)).toBeOnTheScreen();
    });

    it('places the currency button inside the amount area in non-touch mode', async () => {
        // Given a non-touch layout with a currency button and a tagged amount area
        const onCurrencyPress = jest.fn();
        renderWithProviders(
            <NumericInput
                value="100"
                errorText="Test error"
            >
                <NumericInput.ResponsiveLayout
                    amountTestID="numeric-container"
                    currencyButton={
                        <NumericInput.CurrencyButton
                            currency="USD"
                            onPress={onCurrencyPress}
                        />
                    }
                    flipButton={<NumericInput.FlipButton />}
                >
                    <NumericInput.AmountRow
                        testID={INPUT_TEST_ID}
                        symbol="$"
                    />
                </NumericInput.ResponsiveLayout>
            </NumericInput>,
        );
        await waitForBatchedUpdatesWithAct();

        // When inspecting the amount area and the currency button
        const container = screen.getByTestId('numeric-container');
        const currencyButton = screen.getByText('USD');

        // Then the currency button sits under the amount, next to the input and the error, since there is no actions row
        expect(container).toContainElement(currencyButton);
        expect(container).toContainElement(screen.getByTestId(INPUT_TEST_ID));
        expect(container).toContainElement(screen.getByText('Test error'));

        // When pressing the currency button
        fireEvent.press(currencyButton);

        // Then the press handler runs
        expect(onCurrencyPress).toHaveBeenCalledTimes(1);
    });
});
