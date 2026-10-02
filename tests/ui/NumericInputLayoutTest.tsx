import {fireEvent, render, screen} from '@testing-library/react-native';

import Button from '@components/Button';
import ComposeProviders from '@components/ComposeProviders';
import {LocaleContextProvider} from '@components/LocaleContextProvider';
import NumericInput from '@components/NumericInput';
import OnyxListItemProvider from '@components/OnyxListItemProvider';
import Text from '@components/Text';
import type {BaseTextInputRef} from '@components/TextInput/BaseTextInput/types';

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

function renderWithProviders(children: React.ReactNode) {
    return render(<ComposeProviders components={[OnyxListItemProvider, LocaleContextProvider]}>{children}</ComposeProviders>);
}

describe('NumericInput layout composition', () => {
    beforeEach(() => {
        mockWindowDimensions.mockReturnValue(PORTRAIT_PHONE);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('supports headless NumericInput composed without any screen layout', async () => {
        // Given primitives composed directly in the root, without any screen layout
        renderWithProviders(
            <NumericInput value="50">
                <NumericInput.Container>
                    <NumericInput.TextInput testID={INPUT_TEST_ID} />
                </NumericInput.Container>
                <NumericInput.BigNumberPad />
                <Button
                    testID="footer-composed-button"
                    onPress={jest.fn()}
                >
                    Continue
                </Button>
            </NumericInput>,
        );
        await waitForBatchedUpdatesWithAct();

        // Then the input, the number pad, and the screen's own button all render, because NumericInput owns no layout
        expect(screen.getByTestId(INPUT_TEST_ID)).toBeOnTheScreen();
        expect(screen.getByTestId('button_1')).toBeOnTheScreen();
        expect(screen.getByTestId('footer-composed-button')).toBeOnTheScreen();
    });

    it('renders NumericInput.Actions as a centered row of its children', async () => {
        // Given an actions row composed with a currency button, a custom style, and a test ID
        renderWithProviders(
            <NumericInput
                value="10"
                allowNegative
            >
                <NumericInput.Actions
                    testID="actions"
                    style={{marginBottom: 4}}
                >
                    <NumericInput.CurrencyButton
                        currency="USD"
                        onPress={jest.fn()}
                    />
                    <NumericInput.FlipButton />
                </NumericInput.Actions>
            </NumericInput>,
        );
        await waitForBatchedUpdatesWithAct();

        // Then the row lays its children out horizontally with the shared gap, and appends the composition's style, so it
        // needs no knowledge of which buttons it holds
        const actions = screen.getByTestId('actions');
        expect(actions).toHaveStyle({flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 4});
        expect(actions).toContainElement(screen.getByText('USD'));
        expect(actions).toContainElement(screen.getByText('Flip'));
    });

    it('refocuses input and clears selection when clicking empty space in NumericInput.Container', async () => {
        // Given an amount container with a test ID and part of the amount selected
        const inputRef = React.createRef<BaseTextInputRef>();
        renderWithProviders(
            <NumericInput value="5678">
                <NumericInput.Container testID="amount-container-refocus">
                    <NumericInput.TextInput
                        testID={INPUT_TEST_ID}
                        ref={inputRef}
                    />
                </NumericInput.Container>
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

        // Then the default mousedown is prevented so the browser does not blur the input, the selection collapses to its end,
        // and the input is refocused, so the user keeps editing the amount
        expect(preventDefault).toHaveBeenCalledTimes(1);
        expect(input.props.selection).toEqual({start: 3, end: 3});
        expect(focusSpy).toHaveBeenCalledTimes(1);
        focusSpy.mockRestore();
    });

    it('renders error passed via error prop in NumericInput.Container', async () => {
        // Given an input with an error node passed to NumericInput.Container
        renderWithProviders(
            <NumericInput value="50">
                <NumericInput.Container
                    testID="amount-container"
                    error={<Text testID="custom-error">Amount is too high</Text>}
                >
                    <NumericInput.TextInput testID={INPUT_TEST_ID} />
                </NumericInput.Container>
            </NumericInput>,
        );
        await waitForBatchedUpdatesWithAct();

        // Then both the input and the error are displayed
        expect(screen.getByTestId(INPUT_TEST_ID)).toBeOnTheScreen();
        expect(screen.getByTestId('custom-error')).toBeOnTheScreen();
        expect(screen.getByText('Amount is too high')).toBeOnTheScreen();
    });

    it('renders the same NumericInput.Container in portrait and landscape, leaving the orientation to the layout', async () => {
        // Given an amount container and an error composed without any screen layout, on a phone in portrait
        const getComposition = () => (
            <ComposeProviders components={[OnyxListItemProvider, LocaleContextProvider]}>
                <NumericInput
                    value="100"
                    errorText="Test error"
                >
                    <NumericInput.Container testID="amount-container">
                        <NumericInput.TextInput testID={INPUT_TEST_ID} />
                    </NumericInput.Container>
                    <NumericInput.Error />
                </NumericInput>
            </ComposeProviders>
        );
        const {rerender} = render(getComposition());
        await waitForBatchedUpdatesWithAct();
        const portraitId: unknown = screen.getByTestId('amount-container').props.id;
        expect(screen.getByTestId('amount-container')).toHaveStyle({flexGrow: 1});
        expect(screen.getByText('Test error')).toBeOnTheScreen();

        // When the phone rotates to landscape
        mockWindowDimensions.mockReturnValue(LANDSCAPE_PHONE);
        rerender(getComposition());
        await waitForBatchedUpdatesWithAct();

        // Then the container keeps its styles and its refocus id, because only a layout such as FullScreenAmountLayout knows
        // about the orientation, and the error is still displayed where the composition placed it
        expect(screen.getByTestId('amount-container')).toHaveStyle({flexGrow: 1});
        expect(screen.getByTestId('amount-container').props.id).toBe(portraitId);
        expect(typeof portraitId).toBe('string');
        expect(screen.getByText('Test error')).toBeOnTheScreen();
    });
});
