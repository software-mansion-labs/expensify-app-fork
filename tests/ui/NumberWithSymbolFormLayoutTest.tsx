import {fireEvent, render, screen} from '@testing-library/react-native';

import Button from '@components/Button';
import ComposeProviders from '@components/ComposeProviders';
import {LocaleContextProvider} from '@components/LocaleContextProvider';
import LegacyAmountLayout from '@components/NumberWithSymbolForm/LegacyAmountLayout';
import NumericInput from '@components/NumericInput';
import OnyxListItemProvider from '@components/OnyxListItemProvider';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';
import type {BaseTextInputRef} from '@components/TextInput/BaseTextInput/types';

import type * as DeviceCapabilities from '@libs/DeviceCapabilities';

import type * as NativeNavigation from '@react-navigation/native';

import React from 'react';

import findAncestorWithStyle from '../utils/findAncestorWithStyle';
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
const FOOTER_TEST_ID = 'numeric-footer-button';

/** Width of the left landscape column (`numberWithSymbolFormInputContainerLandscape`), which exists only in landscape */
const LANDSCAPE_COLUMN_WIDTH = 400;

function renderWithProviders(children: React.ReactNode) {
    return render(<ComposeProviders components={[OnyxListItemProvider, LocaleContextProvider]}>{children}</ComposeProviders>);
}

describe('NumberWithSymbolForm legacy amount layout', () => {
    beforeEach(() => {
        mockWindowDimensions.mockReturnValue(PORTRAIT_PHONE);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders portrait touch layout with centered container, action buttons, number pad, and footer', async () => {
        // Given a portrait touch layout with actions, a number pad, a footer, and an error, as on the mobile amount step
        renderWithProviders(
            <NumericInput
                value="100"
                allowNegative
                errorText="Test error"
            >
                <LegacyAmountLayout
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
                </LegacyAmountLayout>
            </NumericInput>,
        );
        await waitForBatchedUpdatesWithAct();

        // Then every slot renders, so the legacy portrait form keeps all its controls
        expect(screen.getByTestId(INPUT_TEST_ID)).toBeOnTheScreen();
        expect(screen.getByText('USD')).toBeOnTheScreen();
        expect(screen.getByText('Flip')).toBeOnTheScreen();
        expect(screen.getByText('Test error')).toBeOnTheScreen();
        expect(screen.getByTestId('button_1')).toBeOnTheScreen();
        expect(screen.getByTestId(FOOTER_TEST_ID)).toBeOnTheScreen();

        // Then it is the single portrait column: there is no landscape left column, and the footer shares the pad's container
        expect(findAncestorWithStyle(screen.getByTestId(INPUT_TEST_ID), 'width', LANDSCAPE_COLUMN_WIDTH)).toBeUndefined();
        expect(findAncestorWithStyle(screen.getByTestId(FOOTER_TEST_ID), 'width', '100%')).toHaveProp('id', 'numPadContainerView');
    });

    it('renders landscape touch layout with 2-column layout and footer outside ScrollView', async () => {
        // Given a landscape touch layout with the same slots, as on a rotated phone
        mockWindowDimensions.mockReturnValue(LANDSCAPE_PHONE);

        renderWithProviders(
            <NumericInput
                value="250"
                allowNegative
                errorText="Landscape error"
            >
                <LegacyAmountLayout
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
                </LegacyAmountLayout>
            </NumericInput>,
        );
        await waitForBatchedUpdatesWithAct();

        // Then the amount, actions, and error stay in the left column, centred at its content height so the growing amount
        // container keeps them together
        const leftColumn = findAncestorWithStyle(screen.getByTestId(INPUT_TEST_ID), 'width', LANDSCAPE_COLUMN_WIDTH);
        expect(leftColumn).toHaveStyle({alignSelf: 'center'});
        expect(leftColumn).toContainElement(screen.getByText('EUR'));
        expect(leftColumn).toContainElement(screen.getByText('Flip'));
        expect(leftColumn).toContainElement(screen.getByText('Landscape error'));

        // Then the pad fills its own right column, outside the left one
        const [padColumn] = screen.UNSAFE_root.findAll((node) => typeof node.type === 'string' && node.props.id === 'numPadContainerView');
        expect(padColumn).toHaveStyle({flex: 1});
        expect(padColumn).toContainElement(screen.getByTestId('button_5'));
        expect(leftColumn).not.toContainElement(screen.getByTestId('button_5'));

        // Then the footer sits in its own container below both columns rather than in the pad's container
        expect(findAncestorWithStyle(screen.getByTestId(FOOTER_TEST_ID), 'width', '100%')).toHaveProp('id', 'numPadFooterView');
        expect(padColumn).not.toContainElement(screen.getByTestId(FOOTER_TEST_ID));
    });

    it('renders custom children in the main content container without errors', async () => {
        // Given a layout whose main content carries extra contextual text next to the amount
        renderWithProviders(
            <NumericInput value="10">
                <LegacyAmountLayout>
                    <NumericInput.Container>
                        <NumericInput.TextInput testID={INPUT_TEST_ID} />
                    </NumericInput.Container>
                    <Text>Custom info text</Text>
                </LegacyAmountLayout>
            </NumericInput>,
        );
        await waitForBatchedUpdatesWithAct();

        // Then the extra content renders, so callers can show contextual text beside the amount
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
                <LegacyAmountLayout
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
                </LegacyAmountLayout>
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
                    <LegacyAmountLayout
                        actions={actions}
                        pad={<NumericInput.BigNumberPad />}
                    >
                        <NumericInput.Container>
                            <NumericInput.TextInput testID={INPUT_TEST_ID} />
                        </NumericInput.Container>
                    </LegacyAmountLayout>
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

        // When the layout renders without any action, as the adapter does when a screen shows no action button
        renderLayout(null);
        await waitForBatchedUpdatesWithAct();

        // Then the layout keeps the same gap above the pad, so the centred amount sits at the same height on both screens
        expect(getPadContainer()).toHaveStyle(PAD_GAP);
    });

    it('adds no gap above the footer when there is no number pad', async () => {
        // Given a portrait touch layout that opts out of the number pad and only shows a footer
        renderWithProviders(
            <NumericInput value="10">
                <LegacyAmountLayout
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
                </LegacyAmountLayout>
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

    it('refocuses input and clears selection when clicking empty space on ScrollView with shouldRefocusOnScrollViewClick', async () => {
        // Given an input with selection and shouldRefocusOnScrollViewClick enabled
        const inputRef = React.createRef<BaseTextInputRef>();
        renderWithProviders(
            <NumericInput value="123">
                <LegacyAmountLayout shouldRefocusOnScrollViewClick>
                    <NumericInput.Container>
                        <NumericInput.TextInput
                            testID={INPUT_TEST_ID}
                            ref={inputRef}
                        />
                    </NumericInput.Container>
                </LegacyAmountLayout>
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

        const scrollView = screen.UNSAFE_getByType(ScrollView);

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
});
