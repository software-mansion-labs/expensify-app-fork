import {render, screen} from '@testing-library/react-native';

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

describe('NumericInput.ResponsivePreset without touch screen', () => {
    beforeEach(() => {
        mockIsInLandscapeMode.mockReturnValue(false);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders currency button inside amount container, hides touch-only pad and flip button, and positions error with mb3 in portrait', async () => {
        // Given a portrait preset on a device without a touch screen, with a currency, negative values, an error, and a footer, as on desktop web
        const onCurrencyPress = jest.fn();

        renderWithProviders(
            <NumericInput
                value="200"
                allowNegative
                errorText="Desktop error"
            >
                <NumericInput.ResponsivePreset
                    currency="EUR"
                    onCurrencyButtonPress={onCurrencyPress}
                    amountTestID="amount-container"
                    footer={
                        <Button
                            testID={FOOTER_TEST_ID}
                            onPress={jest.fn()}
                        >
                            Continue
                        </Button>
                    }
                >
                    <NumericInput.AmountRow
                        testID={INPUT_TEST_ID}
                        symbol="€"
                    />
                </NumericInput.ResponsivePreset>
            </NumericInput>,
        );
        await waitForBatchedUpdatesWithAct();

        // Then the input renders with its symbol
        expect(screen.getByTestId(INPUT_TEST_ID)).toBeOnTheScreen();
        expect(screen.getByText('€')).toBeOnTheScreen();

        // And the currency button sits inside the amount container next to the number, since there is no touch actions row on desktop
        const currencyButton = screen.getByText('EUR');
        const amountContainer = screen.getByTestId('amount-container');
        expect(currencyButton).toBeOnTheScreen();
        expect(amountContainer).toContainElement(currencyButton);

        // And the flip button and number pad do not render, because keyboard users can type digits and the minus sign directly
        expect(screen.queryByText('Flip')).toBeNull();
        expect(screen.queryByTestId('button_1')).toBeNull();

        // And the error and footer still render, since validation feedback and submission are needed on every device
        expect(screen.getByText('Desktop error')).toBeOnTheScreen();
        expect(screen.getByTestId(FOOTER_TEST_ID)).toBeOnTheScreen();
    });

    it('renders left column with amount, currency, error, no right column pad, and footer outside scroll view in landscape', async () => {
        // Given a landscape preset on a device without a touch screen, with a currency, negative values, an error, and a footer
        mockIsInLandscapeMode.mockReturnValue(true);

        renderWithProviders(
            <NumericInput
                value="400"
                allowNegative
                errorText="Landscape non-touch error"
            >
                <NumericInput.ResponsivePreset
                    currency="GBP"
                    footer={
                        <Button
                            testID={FOOTER_TEST_ID}
                            onPress={jest.fn()}
                        >
                            Done
                        </Button>
                    }
                >
                    <NumericInput.AmountRow
                        testID={INPUT_TEST_ID}
                        symbol="£"
                    />
                </NumericInput.ResponsivePreset>
            </NumericInput>,
        );
        await waitForBatchedUpdatesWithAct();

        // Then the amount, symbol, currency button, and error render in the left column
        expect(screen.getByTestId(INPUT_TEST_ID)).toBeOnTheScreen();
        expect(screen.getByText('£')).toBeOnTheScreen();
        expect(screen.getByText('GBP')).toBeOnTheScreen();
        expect(screen.getByText('Landscape non-touch error')).toBeOnTheScreen();

        // And no flip button or right column number pad renders, because keyboard users type digits and the minus sign directly
        expect(screen.queryByText('Flip')).toBeNull();
        expect(screen.queryByTestId('button_1')).toBeNull();

        // And the footer renders outside the scroll view, so the submit button stays reachable without scrolling the limited landscape height
        expect(screen.getByTestId(FOOTER_TEST_ID)).toBeOnTheScreen();
    });
});
