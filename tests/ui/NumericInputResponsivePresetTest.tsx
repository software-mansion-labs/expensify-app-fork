import {fireEvent, render, screen} from '@testing-library/react-native';

import Button from '@components/Button';
import ComposeProviders from '@components/ComposeProviders';
import {LocaleContextProvider} from '@components/LocaleContextProvider';
import NumericInput, {NumericResponsivePreset} from '@components/NumericInput';
import OnyxListItemProvider from '@components/OnyxListItemProvider';
import Text from '@components/Text';
import type {BaseTextInputRef} from '@components/TextInput/BaseTextInput/types';

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
    canUseTouchScreen: () => true,
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

describe('NumericInput.ResponsivePreset', () => {
    beforeEach(() => {
        mockIsInLandscapeMode.mockReturnValue(false);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Portrait Touch Quadrant', () => {
        it('renders centered amount, action row with currency and flip button, unified pad+footer, and absolute error', async () => {
            // Given a portrait touch-screen preset with a currency, negative values, an error, and a footer, as on a mobile amount screen
            const onCurrencyPress = jest.fn();
            const onFooterPress = jest.fn();

            renderWithProviders(
                <NumericInput
                    value="150"
                    allowNegative
                    errorText="Portrait error"
                >
                    <NumericInput.ResponsivePreset
                        symbol="$"
                        currency="USD"
                        onCurrencyButtonPress={onCurrencyPress}
                        inputTestID={INPUT_TEST_ID}
                        footer={
                            <Button
                                testID={FOOTER_TEST_ID}
                                onPress={onFooterPress}
                            >
                                Next
                            </Button>
                        }
                    />
                </NumericInput>,
            );
            await waitForBatchedUpdatesWithAct();

            // Then the amount renders with its symbol so the user sees what they are typing
            expect(screen.getByTestId(INPUT_TEST_ID)).toBeOnTheScreen();
            expect(screen.getByText('$')).toBeOnTheScreen();

            // And the currency and flip buttons render in the actions row, since touch users cannot type a minus sign or open a currency picker from the keyboard
            const currencyBtn = screen.getByText('USD');
            const flipBtn = screen.getByText('Flip');
            expect(currencyBtn).toBeOnTheScreen();
            expect(flipBtn).toBeOnTheScreen();

            // And the error renders, positioned absolutely so showing it does not shift the amount or push the pad down
            expect(screen.getByText('Portrait error')).toBeOnTheScreen();

            // And the number pad renders together with the footer, since touch devices enter digits through the on-screen pad
            expect(screen.getByTestId('button_1')).toBeOnTheScreen();
            expect(screen.getByTestId(FOOTER_TEST_ID)).toBeOnTheScreen();

            // When the user presses the currency button
            fireEvent.press(currencyBtn);

            // Then the screen's currency handler is called so it can open the currency picker
            expect(onCurrencyPress).toHaveBeenCalledTimes(1);

            // When the user presses the footer button
            fireEvent.press(screen.getByTestId(FOOTER_TEST_ID));

            // Then the footer's own handler is called, proving the preset does not swallow footer presses
            expect(onFooterPress).toHaveBeenCalledTimes(1);
        });
    });

    describe('Landscape Touch Quadrant', () => {
        beforeEach(() => {
            mockIsInLandscapeMode.mockReturnValue(true);
        });

        it('renders 2-column layout with left column (amount, actions, error), right column pad, and footer outside scroll view', async () => {
            // Given a landscape touch-screen preset with a currency, negative values, an error, and a footer, as on a rotated phone
            renderWithProviders(
                <NumericInput
                    value="300"
                    allowNegative
                    errorText="Landscape touch error"
                >
                    <NumericInput.ResponsivePreset
                        symbol="$"
                        currency="USD"
                        inputTestID={INPUT_TEST_ID}
                        footer={
                            <Button
                                testID={FOOTER_TEST_ID}
                                onPress={jest.fn()}
                            >
                                Submit
                            </Button>
                        }
                    />
                </NumericInput>,
            );
            await waitForBatchedUpdatesWithAct();

            // Then the amount, symbol, currency button, flip button, and error render in the left column, so they stay visible beside the pad on a short screen
            expect(screen.getByTestId(INPUT_TEST_ID)).toBeOnTheScreen();
            expect(screen.getByText('$')).toBeOnTheScreen();
            expect(screen.getByText('USD')).toBeOnTheScreen();
            expect(screen.getByText('Flip')).toBeOnTheScreen();
            expect(screen.getByText('Landscape touch error')).toBeOnTheScreen();

            // And the number pad still renders in the right column, since touch users need it to enter digits
            expect(screen.getByTestId('button_7')).toBeOnTheScreen();

            // And the footer renders outside the scroll view, so the submit button stays reachable without scrolling the limited landscape height
            expect(screen.getByTestId(FOOTER_TEST_ID)).toBeOnTheScreen();
        });
    });

    describe('disableScrollView option', () => {
        it('renders View container without ScrollView contentContainerStyle when disableScrollView is true in portrait', async () => {
            // Given a portrait preset with scrolling disabled, as when the parent screen already provides its own scroll container
            renderWithProviders(
                <NumericInput value="50">
                    <NumericInput.ResponsivePreset
                        disableScrollView
                        testID="preset-root-view"
                        inputTestID={INPUT_TEST_ID}
                    />
                </NumericInput>,
            );
            await waitForBatchedUpdatesWithAct();

            // When inspecting the preset's root container
            const container = screen.getByTestId('preset-root-view');

            // Then it is a plain View without a ScrollView contentContainerStyle, so it does not nest a second scroll container
            expect(container).toBeOnTheScreen();
            expect(container.props.contentContainerStyle).toBeUndefined();
        });

        it('renders View container without ScrollView contentContainerStyle when disableScrollView is true in landscape', async () => {
            // Given a landscape preset with scrolling disabled, to confirm the option is honored by the two-column layout too
            mockIsInLandscapeMode.mockReturnValue(true);

            renderWithProviders(
                <NumericInput value="60">
                    <NumericInput.ResponsivePreset
                        disableScrollView
                        testID="preset-root-view-landscape"
                        inputTestID={INPUT_TEST_ID}
                    />
                </NumericInput>,
            );
            await waitForBatchedUpdatesWithAct();

            // When inspecting the preset's root container
            const container = screen.getByTestId('preset-root-view-landscape');

            // Then it is a plain View without a ScrollView contentContainerStyle, so it does not nest a second scroll container
            expect(container).toBeOnTheScreen();
            expect(container.props.contentContainerStyle).toBeUndefined();
        });
    });

    describe('Empty area refocusing', () => {
        it('refocuses input and clears selection when clicking empty space on ScrollView with shouldRefocusOnScrollViewClick', async () => {
            // Given a preset that opts into refocusing on scroll view clicks, with part of the amount selected
            const inputRef = React.createRef<BaseTextInputRef>();

            renderWithProviders(
                <NumericInput value="1234">
                    <NumericInput.ResponsivePreset
                        shouldRefocusOnScrollViewClick
                        testID="scroll-view-test"
                        inputTestID={INPUT_TEST_ID}
                        ref={inputRef}
                    />
                </NumericInput>,
            );
            await waitForBatchedUpdatesWithAct();

            const input = screen.getByTestId(INPUT_TEST_ID);
            fireEvent(input, 'selectionChange', {nativeEvent: {selection: {start: 0, end: 2}}});
            await waitForBatchedUpdatesWithAct();

            const inputElement = inputRef.current;
            if (!inputElement) {
                throw new Error('Numeric input ref was not assigned');
            }
            const focusSpy = jest.spyOn(inputElement, 'focus');

            // When the user clicks empty space in the scroll view
            const scrollView = screen.getByTestId('scroll-view-test');
            const preventDefault = jest.fn();
            fireEvent(scrollView, 'mouseDown', {preventDefault});
            await waitForBatchedUpdatesWithAct();

            // Then the default mousedown is prevented so the browser does not blur the input, the selection collapses to its end, and the input is refocused, so the next keystroke edits the amount instead of replacing the selection
            expect(preventDefault).toHaveBeenCalledTimes(1);
            expect(input.props.selection).toEqual({start: 2, end: 2});
            expect(focusSpy).toHaveBeenCalledTimes(1);
            focusSpy.mockRestore();
        });

        it('refocuses input and clears selection when clicking empty space in amount container', async () => {
            // Given a preset with a test ID on its amount container and part of the amount selected
            const inputRef = React.createRef<BaseTextInputRef>();

            renderWithProviders(
                <NumericInput value="5678">
                    <NumericInput.ResponsivePreset
                        amountContainerTestID="amount-container-refocus"
                        inputTestID={INPUT_TEST_ID}
                        ref={inputRef}
                    />
                </NumericInput>,
            );
            await waitForBatchedUpdatesWithAct();

            const input = screen.getByTestId(INPUT_TEST_ID);
            fireEvent(input, 'selectionChange', {nativeEvent: {selection: {start: 0, end: 3}}});
            await waitForBatchedUpdatesWithAct();

            const inputElement = inputRef.current;
            if (!inputElement) {
                throw new Error('Numeric input ref was not assigned');
            }
            const focusSpy = jest.spyOn(inputElement, 'focus');

            const amountContainer = screen.getByTestId('amount-container-refocus');
            const containerId: unknown = amountContainer.props.id;
            if (typeof containerId !== 'string') {
                throw new Error('Amount container id was not assigned');
            }

            // When the user clicks the empty area of the amount container itself, not one of its children
            const target = document.createElement('div');
            target.id = containerId;
            const preventDefault = jest.fn();
            fireEvent(amountContainer, 'mouseDown', {nativeEvent: {target}, preventDefault});
            await waitForBatchedUpdatesWithAct();

            // Then the default mousedown is prevented so the browser does not blur the input, the selection collapses to its end, and the input is refocused, so the user keeps editing the amount
            expect(preventDefault).toHaveBeenCalledTimes(1);
            expect(input.props.selection).toEqual({start: 3, end: 3});
            expect(focusSpy).toHaveBeenCalledTimes(1);
            focusSpy.mockRestore();
        });
    });

    describe('Standalone NumericResponsivePreset usage', () => {
        it('works as a standalone component wrapping NumericInput root with full feature set', async () => {
            // Given the standalone preset used without a NumericInput root, receiving the root's props directly
            const onInputChange = jest.fn();

            renderWithProviders(
                <NumericResponsivePreset
                    value="999"
                    onInputChange={onInputChange}
                    allowNegative
                    decimals={2}
                    symbol="$"
                    currency="USD"
                    errorText="Standalone preset error"
                    inputTestID={INPUT_TEST_ID}
                    footer={
                        <Button
                            testID={FOOTER_TEST_ID}
                            onPress={jest.fn()}
                        >
                            Pay
                        </Button>
                    }
                />,
            );
            await waitForBatchedUpdatesWithAct();

            // Then it provides its own root, so the value, symbol, currency and flip buttons, error, and footer all render as with the composed version
            expect(screen.getByTestId(INPUT_TEST_ID)).toBeOnTheScreen();
            expect(screen.getByDisplayValue('999')).toBeOnTheScreen();
            expect(screen.getByText('$')).toBeOnTheScreen();
            expect(screen.getByText('USD')).toBeOnTheScreen();
            expect(screen.getByText('Flip')).toBeOnTheScreen();
            expect(screen.getByText('Standalone preset error')).toBeOnTheScreen();
            expect(screen.getByTestId(FOOTER_TEST_ID)).toBeOnTheScreen();
        });
    });

    describe('Custom children support', () => {
        it('renders custom children in place of the default amount row when provided', async () => {
            // Given a preset whose screen supplies its own amount area as children
            renderWithProviders(
                <NumericInput value="10">
                    <NumericInput.ResponsivePreset>
                        <Text testID="custom-child">Custom Header</Text>
                        <NumericInput.TextInput testID={INPUT_TEST_ID} />
                    </NumericInput.ResponsivePreset>
                </NumericInput>,
            );
            await waitForBatchedUpdatesWithAct();

            // Then the custom children render, so screens can customize the amount area while keeping the preset's layout
            expect(screen.getByTestId('custom-child')).toBeOnTheScreen();
            expect(screen.getByTestId(INPUT_TEST_ID)).toBeOnTheScreen();
        });
    });

    describe('Slots', () => {
        it('renders no number pad when the pad slot is null', async () => {
            // Given a preset for a full-screen form that has no number pad
            renderWithProviders(
                <NumericInput
                    value="10"
                    errorText="No pad error"
                >
                    <NumericInput.ResponsivePreset
                        currency="USD"
                        inputTestID={INPUT_TEST_ID}
                        pad={null}
                    />
                </NumericInput>,
            );
            await waitForBatchedUpdatesWithAct();

            // Then the input, currency button and error render, but no number pad key does
            expect(screen.getByTestId(INPUT_TEST_ID)).toBeOnTheScreen();
            expect(screen.getByText('USD')).toBeOnTheScreen();
            expect(screen.getByText('No pad error')).toBeOnTheScreen();
            expect(screen.queryByTestId('button_1')).toBeNull();
        });

        it('renders no flip button when the flip button slot is null', async () => {
            // Given a negative-capable preset whose screen does not offer flipping the sign
            renderWithProviders(
                <NumericInput
                    value="10"
                    allowNegative
                >
                    <NumericInput.ResponsivePreset
                        currency="USD"
                        flipButton={null}
                    />
                </NumericInput>,
            );
            await waitForBatchedUpdatesWithAct();

            // Then the currency button renders without the flip button
            expect(screen.getByText('USD')).toBeOnTheScreen();
            expect(screen.queryByText('Flip')).toBeNull();
        });

        it('renders no currency button and no symbol when neither is provided', async () => {
            // Given a preset without a currency, a currency button label, or a symbol, as on a unit-less screen
            renderWithProviders(
                <NumericInput value="10">
                    <NumericInput.ResponsivePreset inputTestID={INPUT_TEST_ID} />
                </NumericInput>,
            );
            await waitForBatchedUpdatesWithAct();

            // Then only the input renders, without an empty currency button or a symbol beside the number
            expect(screen.getByTestId(INPUT_TEST_ID)).toBeOnTheScreen();
            expect(screen.queryByLabelText(/Select a currency/)).toBeNull();
            expect(screen.queryByText('$')).toBeNull();
        });
    });

    describe('Text input props', () => {
        it('forwards the props it does not consume to the text input', async () => {
            // Given a preset configured with text input behavior a screen relies on
            renderWithProviders(
                <NumericInput value="10">
                    <NumericInput.ResponsivePreset
                        inputTestID={INPUT_TEST_ID}
                        accessibilityLabel="Amount (USD)"
                        keyboardType="number-pad"
                        disableKeyboard={false}
                        submitBehavior="blurAndSubmit"
                    />
                </NumericInput>,
            );
            await waitForBatchedUpdatesWithAct();

            // When inspecting the rendered input
            const input = screen.getByTestId(INPUT_TEST_ID);

            // Then the accessibility label, keyboard type, soft keyboard, and submit behavior follow the preset's props
            expect(input.props.accessibilityLabel).toBe('Amount (USD)');
            expect(input.props.keyboardType).toBe('number-pad');
            expect(input.props.showSoftInputOnFocus).not.toBe(false);
            expect(input.props.submitBehavior).toBe('blurAndSubmit');
        });
    });
});
