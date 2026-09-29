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

function renderWithProviders(children: React.ReactNode) {
    return render(<ComposeProviders components={[OnyxListItemProvider, LocaleContextProvider]}>{children}</ComposeProviders>);
}

describe('NumericInput layout composition', () => {
    beforeEach(() => {
        mockIsInLandscapeMode.mockReturnValue(false);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders portrait touch layout with centered container, action buttons, number pad, and footer', async () => {
        renderWithProviders(
            <NumericInput
                value="100"
                allowNegative
                errorText="Test error"
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
                        <NumericInput.MinusSign />
                        <NumericInput.TextInput testID={INPUT_TEST_ID} />
                        <NumericInput.Symbol>$</NumericInput.Symbol>
                    </NumericInput.Container>
                    <NumericInput.Error />
                </NumericInput.ResponsiveLayout>
            </NumericInput>,
        );
        await waitForBatchedUpdatesWithAct();

        expect(screen.getByTestId(INPUT_TEST_ID)).toBeOnTheScreen();
        expect(screen.getByText('USD')).toBeOnTheScreen();
        expect(screen.getByText('Flip')).toBeOnTheScreen();
        expect(screen.getByText('Test error')).toBeOnTheScreen();
        expect(screen.getByTestId('button_1')).toBeOnTheScreen();
        expect(screen.getByTestId(FOOTER_TEST_ID)).toBeOnTheScreen();
    });

    it('renders landscape touch layout with 2-column layout and footer outside ScrollView', async () => {
        mockIsInLandscapeMode.mockReturnValue(true);

        renderWithProviders(
            <NumericInput
                value="250"
                allowNegative
                errorText="Landscape error"
            >
                <NumericInput.ResponsiveLayout
                    actions={
                        <NumericInput.Actions>
                            <NumericInput.CurrencyButton
                                currency="EUR"
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
                            Submit
                        </Button>
                    }
                >
                    <NumericInput.Container>
                        <NumericInput.TextInput testID={INPUT_TEST_ID} />
                        <NumericInput.Symbol>€</NumericInput.Symbol>
                    </NumericInput.Container>
                    <NumericInput.Error />
                </NumericInput.ResponsiveLayout>
            </NumericInput>,
        );
        await waitForBatchedUpdatesWithAct();

        expect(screen.getByTestId(INPUT_TEST_ID)).toBeOnTheScreen();
        expect(screen.getByText('EUR')).toBeOnTheScreen();
        expect(screen.getByText('Flip')).toBeOnTheScreen();
        expect(screen.getByText('Landscape error')).toBeOnTheScreen();
        expect(screen.getByTestId('button_5')).toBeOnTheScreen();
        expect(screen.getByTestId(FOOTER_TEST_ID)).toBeOnTheScreen();
    });

    it('supports headless NumericInput with direct composition without ResponsiveLayout', async () => {
        renderWithProviders(
            <NumericInput value="50">
                <NumericInput.Container>
                    <NumericInput.TextInput testID={INPUT_TEST_ID} />
                </NumericInput.Container>
                <NumericInput.BigNumberPad />
                <NumericInput.Footer>
                    <Button
                        testID="footer-composed-button"
                        onPress={jest.fn()}
                    >
                        Continue
                    </Button>
                </NumericInput.Footer>
            </NumericInput>,
        );
        await waitForBatchedUpdatesWithAct();

        expect(screen.getByTestId(INPUT_TEST_ID)).toBeOnTheScreen();
        expect(screen.getByTestId('button_1')).toBeOnTheScreen();
        expect(screen.getByTestId('footer-composed-button')).toBeOnTheScreen();
    });

    it('renders custom children in the main content container without errors', async () => {
        renderWithProviders(
            <NumericInput value="10">
                <NumericInput.ResponsiveLayout>
                    <NumericInput.Container>
                        <NumericInput.TextInput testID={INPUT_TEST_ID} />
                    </NumericInput.Container>
                    <Text>Custom info text</Text>
                </NumericInput.ResponsiveLayout>
            </NumericInput>,
        );
        await waitForBatchedUpdatesWithAct();

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
                    <NumericInput.Container>
                        <NumericInput.TextInput
                            testID={INPUT_TEST_ID}
                            ref={inputRef}
                        />
                    </NumericInput.Container>
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

        // The pad itself carries no id, so the closest ancestor with one is the layout-owned unified container
        let padParent = screen.getByTestId('pad-container').parent;
        while (padParent && typeof padParent.props.id !== 'string') {
            padParent = padParent.parent;
        }
        if (!padParent) {
            throw new Error('Unified container was not found');
        }
        const containerId: unknown = padParent.props.id;
        if (typeof containerId !== 'string') {
            throw new Error('Unified container id was not assigned');
        }
        expect(containerId).toBe('numPadContainerView');
        expect(padParent).toContainElement(screen.getByTestId(FOOTER_TEST_ID));

        // When pressing the unified container's empty area
        const target = document.createElement('div');
        target.id = containerId;
        const preventDefault = jest.fn();
        fireEvent(padParent, 'mouseDown', {nativeEvent: {target}, preventDefault});
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
        fireEvent(padParent, 'mouseDown', {nativeEvent: {target: childTarget}, preventDefault});
        await waitForBatchedUpdatesWithAct();

        // Then the event is ignored and does not clear selection
        expect(preventDefault).not.toHaveBeenCalled();
        expect(focusSpy).not.toHaveBeenCalled();
        focusSpy.mockRestore();
    });

    it('keeps the same gap above the number pad whether or not any action renders', async () => {
        // Given two portrait touch layouts with a number pad, one with a currency action (like the amount step) and one
        // without any action (like the hours or tax rate pages)
        const renderLayout = (actions: React.ReactNode) =>
            renderWithProviders(
                <NumericInput value="10">
                    <NumericInput.ResponsiveLayout
                        actions={actions}
                        pad={<NumericInput.BigNumberPad />}
                    >
                        <NumericInput.Container>
                            <NumericInput.TextInput testID={INPUT_TEST_ID} />
                        </NumericInput.Container>
                    </NumericInput.ResponsiveLayout>
                </NumericInput>,
            );
        // The layout's 8 pt gap above the pad, the same `mb2` the legacy form kept under its actions row whenever the pad showed
        const PAD_GAP = {marginTop: 8};
        const getPadContainer = () => {
            const hostContainer = screen.UNSAFE_getAllByProps({id: 'numPadContainerView'}).find((element) => typeof element.type === 'string');
            if (!hostContainer) {
                throw new Error('Pad container was not rendered');
            }
            return hostContainer;
        };

        renderLayout(
            <NumericInput.Actions testID="actions">
                <NumericInput.CurrencyButton
                    currency="USD"
                    onPress={jest.fn()}
                />
            </NumericInput.Actions>,
        );
        await waitForBatchedUpdatesWithAct();
        expect(getPadContainer()).toHaveStyle(PAD_GAP);
        expect(screen.getByTestId('actions')).not.toHaveStyle({marginBottom: 8});
        screen.unmount();

        // When the layout renders without any action
        renderLayout(<NumericInput.Actions />);
        await waitForBatchedUpdatesWithAct();

        // Then the layout keeps the same gap above the pad, so the centred amount sits at the same height on both screens
        expect(getPadContainer()).toHaveStyle(PAD_GAP);
    });

    it('adds no gap above the footer when there is no number pad', async () => {
        // Given a portrait touch layout that opts out of the number pad and only shows a footer
        renderWithProviders(
            <NumericInput value="10">
                <NumericInput.ResponsiveLayout
                    pad={null}
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
                    </NumericInput.Container>
                </NumericInput.ResponsiveLayout>
            </NumericInput>,
        );
        await waitForBatchedUpdatesWithAct();

        // When reading the spacing of the container holding the footer
        const container = screen.UNSAFE_getAllByProps({id: 'numPadContainerView'}).find((element) => typeof element.type === 'string');
        if (!container) {
            throw new Error('Footer container was not rendered');
        }

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
                    <NumericInput.Container>
                        <NumericInput.TextInput testID={INPUT_TEST_ID} />
                    </NumericInput.Container>
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
                    <NumericInput.Container>
                        <NumericInput.TextInput testID={INPUT_TEST_ID} />
                    </NumericInput.Container>
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
                    <NumericInput.Container>
                        <NumericInput.TextInput
                            testID={INPUT_TEST_ID}
                            ref={inputRef}
                        />
                    </NumericInput.Container>
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

    it('positions NumericInput.Error in portrait mode and landscape mode', async () => {
        // Given an input with errorText rendered in portrait mode
        const {rerender} = renderWithProviders(
            <NumericInput
                value="100"
                errorText="Test error"
            >
                <NumericInput.Container>
                    <NumericInput.TextInput testID={INPUT_TEST_ID} />
                </NumericInput.Container>
                <NumericInput.Error />
            </NumericInput>,
        );
        await waitForBatchedUpdatesWithAct();

        // Then in portrait mode the error container is rendered
        expect(screen.getByText('Test error')).toBeOnTheScreen();

        // When switching to landscape mode
        mockIsInLandscapeMode.mockReturnValue(true);
        rerender(
            <ComposeProviders components={[OnyxListItemProvider, LocaleContextProvider]}>
                <NumericInput
                    value="100"
                    errorText="Test error"
                >
                    <NumericInput.Container>
                        <NumericInput.TextInput testID={INPUT_TEST_ID} />
                    </NumericInput.Container>
                    <NumericInput.Error />
                </NumericInput>
            </ComposeProviders>,
        );
        await waitForBatchedUpdatesWithAct();

        // Then the error remains displayed in landscape mode
        expect(screen.getByText('Test error')).toBeOnTheScreen();
    });
});
