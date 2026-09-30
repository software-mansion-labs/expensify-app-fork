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

function Providers({children}: {children: React.ReactNode}) {
    return <ComposeProviders components={[OnyxListItemProvider, LocaleContextProvider]}>{children}</ComposeProviders>;
}

/** Renders inside the app providers, which a later `screen.rerender` keeps. */
function renderWithProviders(children: React.ReactElement) {
    return render(children, {wrapper: Providers});
}

/** Finds the closest host view above `element` with an id, which is how the layout marks the areas that refocus the input. */
function getClosestViewWithId(element: ReturnType<typeof screen.getByTestId>) {
    let ancestor = element.parent;
    while (ancestor && (typeof ancestor.type !== 'string' || typeof ancestor.props.id !== 'string')) {
        ancestor = ancestor.parent;
    }
    if (!ancestor) {
        throw new Error('No ancestor view with an id was rendered');
    }
    return ancestor;
}

describe('NumericInput layout composition', () => {
    beforeEach(() => {
        mockIsInLandscapeMode.mockReturnValue(false);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders portrait touch layout with the amount, action buttons, error, number pad, and footer', async () => {
        // Given a portrait touch layout with every slot filled
        renderWithProviders(
            <NumericInput
                value="100"
                allowNegative
                errorText="Test error"
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

        // When examining the screen
        // Then every slot renders, and the layout places the root error itself
        expect(screen.getByTestId(INPUT_TEST_ID)).toBeOnTheScreen();
        expect(screen.getByText('USD')).toBeOnTheScreen();
        expect(screen.getByText('Flip')).toBeOnTheScreen();
        expect(screen.getByText('Test error')).toBeOnTheScreen();
        expect(screen.getByTestId('button_1')).toBeOnTheScreen();
        expect(screen.getByTestId(FOOTER_TEST_ID)).toBeOnTheScreen();
    });

    it('renders landscape touch layout with 2-column layout and footer outside ScrollView', async () => {
        // Given a landscape touch layout with every slot filled
        mockIsInLandscapeMode.mockReturnValue(true);

        renderWithProviders(
            <NumericInput
                value="250"
                allowNegative
                errorText="Landscape error"
            >
                <NumericInput.ResponsiveLayout
                    currencyButton={
                        <NumericInput.CurrencyButton
                            currency="EUR"
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
                            Submit
                        </Button>
                    }
                >
                    <NumericInput.AmountRow
                        testID={INPUT_TEST_ID}
                        symbol="€"
                    />
                </NumericInput.ResponsiveLayout>
            </NumericInput>,
        );
        await waitForBatchedUpdatesWithAct();

        // When examining the screen
        // Then every slot renders in the two columns and the footer below them
        expect(screen.getByTestId(INPUT_TEST_ID)).toBeOnTheScreen();
        expect(screen.getByText('EUR')).toBeOnTheScreen();
        expect(screen.getByText('Flip')).toBeOnTheScreen();
        expect(screen.getByText('Landscape error')).toBeOnTheScreen();
        expect(screen.getByTestId('button_5')).toBeOnTheScreen();
        expect(screen.getByTestId(FOOTER_TEST_ID)).toBeOnTheScreen();
    });

    it('supports composing the primitives directly without ResponsiveLayout', async () => {
        // Given a headless NumericInput that places the amount, the pad and a button itself
        renderWithProviders(
            <NumericInput value="50">
                <NumericInput.AmountRow testID={INPUT_TEST_ID} />
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

        // When examining the screen
        // Then all three render without the layout
        expect(screen.getByTestId(INPUT_TEST_ID)).toBeOnTheScreen();
        expect(screen.getByTestId('button_1')).toBeOnTheScreen();
        expect(screen.getByTestId('footer-composed-button')).toBeOnTheScreen();
    });

    it('renders custom children in the amount area without errors', async () => {
        // Given a layout whose amount area holds extra content next to the amount row
        renderWithProviders(
            <NumericInput value="10">
                <NumericInput.ResponsiveLayout>
                    <NumericInput.AmountRow testID={INPUT_TEST_ID} />
                    <Text>Custom info text</Text>
                </NumericInput.ResponsiveLayout>
            </NumericInput>,
        );
        await waitForBatchedUpdatesWithAct();

        // When examining the screen
        // Then the extra content renders
        expect(screen.getByText('Custom info text')).toBeOnTheScreen();
    });

    it('unifies pad and footer into a single container in portrait mode and refocuses input on empty area press', async () => {
        // Given an input with selection and a ref tracking focus, rendered in portrait mode with pad and footer
        const inputRef = React.createRef<BaseTextInputRef>();
        renderWithProviders(
            <NumericInput
                value="100"
                allowNegative
            >
                <NumericInput.ResponsiveLayout
                    pad={<NumericInput.BigNumberPad testID="pad-container" />}
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
                        ref={inputRef}
                    />
                </NumericInput.ResponsiveLayout>
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

        // The pad wrapper carries no id, so the closest view with one is the layout-owned unified container
        const container = getClosestViewWithId(screen.getByTestId('pad-container'));
        const containerId: unknown = container.props.id;
        if (typeof containerId !== 'string') {
            throw new Error('Unified container id was not assigned');
        }
        expect(container).toContainElement(screen.getByTestId(FOOTER_TEST_ID));

        // When pressing the unified container's empty area
        const target = document.createElement('div');
        target.id = containerId;
        const preventDefault = jest.fn();
        fireEvent(container, 'mouseDown', {nativeEvent: {target}, preventDefault});
        await waitForBatchedUpdatesWithAct();

        // Then browser blur is prevented, selection is cleared, and input is refocused
        expect(preventDefault).toHaveBeenCalledTimes(1);
        expect(input.props.selection).toEqual({start: 2, end: 2});
        expect(focusSpy).toHaveBeenCalledTimes(1);

        // When pressing an element with a different ID (e.g. child button)
        preventDefault.mockClear();
        focusSpy.mockClear();
        const childTarget = document.createElement('div');
        childTarget.id = 'button_1';
        fireEvent(container, 'mouseDown', {nativeEvent: {target: childTarget}, preventDefault});
        await waitForBatchedUpdatesWithAct();

        // Then the event is ignored and does not clear selection
        expect(preventDefault).not.toHaveBeenCalled();
        expect(focusSpy).not.toHaveBeenCalled();
        focusSpy.mockRestore();
    });

    it('refocuses the input when the empty amount area is pressed in portrait', async () => {
        // Given an input with a selection, rendered in a portrait layout that tags its amount area
        const inputRef = React.createRef<BaseTextInputRef>();
        renderWithProviders(
            <NumericInput value="1234">
                <NumericInput.ResponsiveLayout amountTestID="amount-area">
                    <NumericInput.AmountRow
                        testID={INPUT_TEST_ID}
                        ref={inputRef}
                    />
                </NumericInput.ResponsiveLayout>
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

        // When a mousedown lands on the amount area itself
        const target = document.createElement('div');
        const preventDefault = jest.fn();
        fireEvent(screen.getByTestId('amount-area'), 'mouseDown', {nativeEvent: {target}, currentTarget: target, preventDefault});
        await waitForBatchedUpdatesWithAct();

        // Then the input is refocused with a collapsed caret
        expect(preventDefault).toHaveBeenCalledTimes(1);
        expect(input.props.selection).toEqual({start: 2, end: 2});
        expect(focusSpy).toHaveBeenCalledTimes(1);
        focusSpy.mockRestore();
    });

    it('gives the pad container of each layout its own id', async () => {
        // Given two portrait layouts with a number pad on one screen
        renderWithProviders(
            <>
                <NumericInput>
                    <NumericInput.ResponsiveLayout pad={<NumericInput.BigNumberPad testID="pad-a" />}>
                        <NumericInput.AmountRow />
                    </NumericInput.ResponsiveLayout>
                </NumericInput>
                <NumericInput>
                    <NumericInput.ResponsiveLayout pad={<NumericInput.BigNumberPad testID="pad-b" />}>
                        <NumericInput.AmountRow />
                    </NumericInput.ResponsiveLayout>
                </NumericInput>
            </>,
        );
        await waitForBatchedUpdatesWithAct();

        // When reading the id of the container that holds each pad
        const firstId: unknown = getClosestViewWithId(screen.getByTestId('pad-a')).props.id;
        const secondId: unknown = getClosestViewWithId(screen.getByTestId('pad-b')).props.id;

        // Then the ids differ, so a press on one container never refocuses the other input
        expect(firstId).not.toBe(secondId);
    });

    it('keeps the same gap above the number pad whether or not any action renders', async () => {
        // Given two portrait touch layouts with a number pad, one with a currency button (like the amount step) and one
        // without any action (like the hours or tax rate pages)
        const renderLayout = (currencyButton: React.ReactElement | null) =>
            renderWithProviders(
                <NumericInput value="10">
                    <NumericInput.ResponsiveLayout
                        currencyButton={currencyButton}
                        pad={<NumericInput.BigNumberPad testID="pad" />}
                    >
                        <NumericInput.AmountRow testID={INPUT_TEST_ID} />
                    </NumericInput.ResponsiveLayout>
                </NumericInput>,
            );
        // The layout's 8 pt gap above the pad, the same `mb2` the legacy form kept under its actions row whenever the pad showed
        const PAD_GAP = {marginTop: 8};

        renderLayout(
            <NumericInput.CurrencyButton
                currency="USD"
                onPress={jest.fn()}
            />,
        );
        await waitForBatchedUpdatesWithAct();
        expect(getClosestViewWithId(screen.getByTestId('pad'))).toHaveStyle(PAD_GAP);
        screen.unmount();

        // When the layout renders without any action
        renderLayout(null);
        await waitForBatchedUpdatesWithAct();

        // Then the layout keeps the same gap above the pad, so the centred amount sits at the same height on both screens
        expect(getClosestViewWithId(screen.getByTestId('pad'))).toHaveStyle(PAD_GAP);
    });

    it('adds no gap above the footer when there is no number pad', async () => {
        // Given a portrait touch layout that opts out of the number pad and only shows a footer
        renderWithProviders(
            <NumericInput value="10">
                <NumericInput.ResponsiveLayout
                    pad={null}
                    footer={<Text testID={FOOTER_TEST_ID}>Next</Text>}
                >
                    <NumericInput.AmountRow testID={INPUT_TEST_ID} />
                </NumericInput.ResponsiveLayout>
            </NumericInput>,
        );
        await waitForBatchedUpdatesWithAct();

        // When reading the spacing of the container holding the footer
        const container = getClosestViewWithId(screen.getByTestId(FOOTER_TEST_ID));

        // Then the pad gap is not reserved, matching the legacy form that only spaced the actions when the pad was shown
        expect(container).not.toHaveStyle({marginTop: 8});
    });

    it('renders a View instead of ScrollView when disableScrollView is true in portrait mode', async () => {
        // Given an input rendered with disableScrollView in portrait mode
        renderWithProviders(
            <NumericInput value="10">
                <NumericInput.ResponsiveLayout
                    disableScrollView
                    testID="responsive-view-container"
                >
                    <NumericInput.AmountRow testID={INPUT_TEST_ID} />
                </NumericInput.ResponsiveLayout>
            </NumericInput>,
        );
        await waitForBatchedUpdatesWithAct();

        // When finding the root container by testID
        const container = screen.getByTestId('responsive-view-container');

        // Then it renders as a View without ScrollView contentContainerStyle
        expect(container).toBeOnTheScreen();
        expect(container.props.contentContainerStyle).toBeUndefined();
    });

    it('renders a View instead of ScrollView when disableScrollView is true in landscape mode', async () => {
        // Given an input rendered with disableScrollView in landscape mode
        mockIsInLandscapeMode.mockReturnValue(true);

        renderWithProviders(
            <NumericInput value="20">
                <NumericInput.ResponsiveLayout
                    disableScrollView
                    testID="responsive-view-landscape-container"
                    pad={<NumericInput.BigNumberPad />}
                >
                    <NumericInput.AmountRow testID={INPUT_TEST_ID} />
                </NumericInput.ResponsiveLayout>
            </NumericInput>,
        );
        await waitForBatchedUpdatesWithAct();

        // When finding the root container by testID
        const container = screen.getByTestId('responsive-view-landscape-container');

        // Then it renders as a View without ScrollView contentContainerStyle
        expect(container).toBeOnTheScreen();
        expect(container.props.contentContainerStyle).toBeUndefined();
    });

    it('refocuses input and clears selection when clicking empty space on ScrollView with shouldRefocusOnScrollViewClick', async () => {
        // Given an input with selection and shouldRefocusOnScrollViewClick enabled
        const inputRef = React.createRef<BaseTextInputRef>();
        renderWithProviders(
            <NumericInput value="123">
                <NumericInput.ResponsiveLayout
                    shouldRefocusOnScrollViewClick
                    testID="responsive-scroll-view"
                >
                    <NumericInput.AmountRow
                        testID={INPUT_TEST_ID}
                        ref={inputRef}
                    />
                </NumericInput.ResponsiveLayout>
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

        const scrollView = screen.getByTestId('responsive-scroll-view');

        // When clicking the ScrollView
        const preventDefault = jest.fn();
        fireEvent(scrollView, 'mouseDown', {preventDefault});
        await waitForBatchedUpdatesWithAct();

        // Then focus is restored and selection is collapsed
        expect(preventDefault).toHaveBeenCalledTimes(1);
        expect(input.props.selection).toEqual({start: 2, end: 2});
        expect(focusSpy).toHaveBeenCalledTimes(1);
        focusSpy.mockRestore();
    });

    it('places the root error exactly once in portrait mode and in landscape mode', async () => {
        // Given an input with errorText rendered in a portrait layout
        const renderLayout = () => (
            <NumericInput
                value="100"
                errorText="Test error"
            >
                <NumericInput.ResponsiveLayout pad={<NumericInput.BigNumberPad />}>
                    <NumericInput.AmountRow testID={INPUT_TEST_ID} />
                </NumericInput.ResponsiveLayout>
            </NumericInput>
        );
        renderWithProviders(renderLayout());
        await waitForBatchedUpdatesWithAct();

        // Then in portrait mode the error renders once, floating over the amount area
        expect(screen.getAllByText('Test error')).toHaveLength(1);

        // When switching to landscape mode
        mockIsInLandscapeMode.mockReturnValue(true);
        screen.rerender(renderLayout());
        await waitForBatchedUpdatesWithAct();

        // Then the error still renders once, now in the left column under the actions
        expect(screen.getAllByText('Test error')).toHaveLength(1);
    });
});
