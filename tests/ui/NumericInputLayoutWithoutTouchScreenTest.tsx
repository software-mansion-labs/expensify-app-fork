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
                    actions={
                        <NumericInput.Actions>
                            <NumericInput.CurrencyButton
                                currency="USD"
                                onPress={jest.fn()}
                            />
                            <NumericInput.FlipButton />
                        </NumericInput.Actions>
                    }
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
                    <NumericInput.Container>
                        <NumericInput.TextInput testID={INPUT_TEST_ID} />
                        <NumericInput.Symbol>$</NumericInput.Symbol>
                    </NumericInput.Container>
                    <NumericInput.Error />
                </NumericInput.ResponsiveLayout>
            </NumericInput>,
        );
        await waitForBatchedUpdatesWithAct();

        // When examining the screen elements
        // Then the text input, currency button, error, and footer are displayed, while touch-only elements like FlipButton and BigNumberPad are hidden
        expect(screen.getByTestId(INPUT_TEST_ID)).toBeOnTheScreen();
        expect(screen.getByText('USD')).toBeOnTheScreen();
        // FlipButton and BigNumberPad are touch-only, so they should not render
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
                    actions={
                        <NumericInput.Actions>
                            <NumericInput.CurrencyButton
                                currency="USD"
                                onPress={jest.fn()}
                            />
                            <NumericInput.FlipButton />
                        </NumericInput.Actions>
                    }
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
                    <NumericInput.Container>
                        <NumericInput.TextInput testID={INPUT_TEST_ID} />
                        <NumericInput.Symbol>$</NumericInput.Symbol>
                    </NumericInput.Container>
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

    it('renders action inside NumericInput.Container in non-touch mode', async () => {
        // Given an input in non-touch mode with a currency button passed via the action prop of NumericInput.Container
        const onCurrencyPress = jest.fn();
        renderWithProviders(
            <NumericInput
                value="100"
                errorText="Test error"
            >
                <NumericInput.ResponsiveLayout
                    actions={
                        <NumericInput.Actions hideOnNonTouch>
                            <NumericInput.FlipButton />
                        </NumericInput.Actions>
                    }
                    footer={
                        <Button
                            testID={FOOTER_TEST_ID}
                            onPress={jest.fn()}
                        >
                            Next
                        </Button>
                    }
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
                </NumericInput.ResponsiveLayout>
            </NumericInput>,
        );
        await waitForBatchedUpdatesWithAct();

        // When inspecting the container and the currency button
        const container = screen.getByTestId('numeric-container');
        const currencyButton = screen.getByText('USD');

        // Then the currency button is rendered inside the centered amount container alongside the input and error
        expect(currencyButton).toBeOnTheScreen();
        expect(container).toContainElement(currencyButton);
        expect(screen.getByTestId(INPUT_TEST_ID)).toBeOnTheScreen();
        expect(screen.getByText('Test error')).toBeOnTheScreen();

        // And pressing the currency button triggers the press handler
        fireEvent.press(currencyButton);
        expect(onCurrencyPress).toHaveBeenCalledTimes(1);
    });

    it('hides NumericInput.Actions in non-touch mode when hideOnNonTouch is enabled', async () => {
        // Given an input in non-touch mode with NumericInput.Actions configured with hideOnNonTouch
        renderWithProviders(
            <NumericInput value="100">
                <NumericInput.ResponsiveLayout
                    actions={
                        <NumericInput.Actions
                            hideOnNonTouch
                            testID="actions-container"
                        >
                            <NumericInput.CurrencyButton
                                currency="USD"
                                onPress={jest.fn()}
                            />
                        </NumericInput.Actions>
                    }
                >
                    <NumericInput.Container>
                        <NumericInput.TextInput testID={INPUT_TEST_ID} />
                    </NumericInput.Container>
                </NumericInput.ResponsiveLayout>
            </NumericInput>,
        );
        await waitForBatchedUpdatesWithAct();

        // When querying for the actions container
        const actionsContainer = screen.queryByTestId('actions-container');

        // Then NumericInput.Actions returns null to avoid displaying actions in non-touch layouts
        expect(actionsContainer).toBeNull();
        expect(screen.queryByText('USD')).toBeNull();
    });

    it('hides NumericInput.Actions when children render null', async () => {
        // Given an input on a non-touch screen where the only action child is NumericFlipButton which renders null on non-touch
        renderWithProviders(
            <NumericInput
                value="100"
                allowNegative
            >
                <NumericInput.ResponsiveLayout
                    actions={
                        <NumericInput.Actions testID="actions-container">
                            <NumericInput.FlipButton />
                        </NumericInput.Actions>
                    }
                >
                    <NumericInput.Container>
                        <NumericInput.TextInput testID={INPUT_TEST_ID} />
                    </NumericInput.Container>
                </NumericInput.ResponsiveLayout>
            </NumericInput>,
        );
        await waitForBatchedUpdatesWithAct();

        // When querying for the actions container
        const actionsContainer = screen.queryByTestId('actions-container');

        // Then NumericInput.Actions returns null to prevent an empty View from rendering
        expect(actionsContainer).toBeNull();
    });

    it('hides NumericInput.Actions when children are explicitly null or undefined', async () => {
        // Given an input with NumericInput.Actions containing only null and undefined children
        renderWithProviders(
            <NumericInput value="100">
                <NumericInput.Actions testID="actions-container">
                    {null}
                    {undefined}
                </NumericInput.Actions>
                <NumericInput.Container>
                    <NumericInput.TextInput testID={INPUT_TEST_ID} />
                </NumericInput.Container>
            </NumericInput>,
        );
        await waitForBatchedUpdatesWithAct();

        // When querying for the actions container
        const actionsContainer = screen.queryByTestId('actions-container');

        // Then NumericInput.Actions returns null because no visible children exist
        expect(actionsContainer).toBeNull();
    });
});
