import {fireEvent, render, screen} from '@testing-library/react-native';

import Button from '@components/Button';
import ComposeProviders from '@components/ComposeProviders';
import FullScreenAmountLayout from '@components/FullScreenAmountLayout';
import {LocaleContextProvider} from '@components/LocaleContextProvider';
import NumericInput from '@components/NumericInput';
import OnyxListItemProvider from '@components/OnyxListItemProvider';
import type {BaseTextInputRef} from '@components/TextInput/BaseTextInput/types';

import type * as DeviceCapabilities from '@libs/DeviceCapabilities';

import type * as NativeNavigation from '@react-navigation/native';

import React from 'react';
import {StyleSheet} from 'react-native';

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

const ROOT_TEST_ID = 'layout-root';
const BODY_TEST_ID = 'layout-body';
const MAIN_TEST_ID = 'layout-main';
const PAD_TEST_ID = 'layout-pad';
const FOOTER_TEST_ID = 'layout-footer';
const INPUT_TEST_ID = 'numeric-text-input';
const CONTAINER_TEST_ID = 'amount-container';

type LayoutOptions = {
    /** Whether the layout renders a footer below the body */
    hasFooter?: boolean;
};

function renderLayout(inputRef?: React.Ref<BaseTextInputRef>, options?: LayoutOptions) {
    return render(getLayout(inputRef, options));
}

function getLayout(inputRef?: React.Ref<BaseTextInputRef>, {hasFooter = true}: LayoutOptions = {}) {
    return (
        <ComposeProviders components={[OnyxListItemProvider, LocaleContextProvider]}>
            <NumericInput value="12.5">
                <FullScreenAmountLayout testID={ROOT_TEST_ID}>
                    <FullScreenAmountLayout.Body testID={BODY_TEST_ID}>
                        <FullScreenAmountLayout.Main testID={MAIN_TEST_ID}>
                            <NumericInput.Container testID={CONTAINER_TEST_ID}>
                                <NumericInput.TextInput
                                    testID={INPUT_TEST_ID}
                                    ref={inputRef}
                                />
                                <NumericInput.Symbol>%</NumericInput.Symbol>
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
        </ComposeProviders>
    );
}

function isFocusableInput(input: BaseTextInputRef): input is BaseTextInputRef & {isFocused: () => boolean} {
    return 'isFocused' in input && typeof input.isFocused === 'function';
}

function createMouseDownEvent(target: Node | undefined) {
    return {nativeEvent: {target}, preventDefault: jest.fn(), isDefaultPrevented: () => false};
}

describe('FullScreenAmountLayout', () => {
    beforeEach(() => {
        mockWindowDimensions.mockReturnValue(PORTRAIT_PHONE);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders a single scrollable column with the footer inside the scroll view outside phone landscape', async () => {
        // Given a phone in portrait (tablets in landscape are covered by FullScreenAmountLayoutTabletTest)
        mockWindowDimensions.mockReturnValue(PORTRAIT_PHONE);

        // When the layout renders
        renderLayout();
        await waitForBatchedUpdatesWithAct();

        // Then the root is the scroll view holding the body and footer, and the body is a plain column
        const root = screen.getByTestId(ROOT_TEST_ID);
        expect(root.props.contentContainerStyle).toBeDefined();
        expect(root).toContainElement(screen.getByTestId(FOOTER_TEST_ID));
        expect(screen.getByTestId(BODY_TEST_ID).props.contentContainerStyle).toBeUndefined();
    });

    it('lets the single column only grow, so a short screen scrolls instead of squeezing the amount under the pad', async () => {
        // Given a phone in portrait, where the pad has a fixed height below the amount
        mockWindowDimensions.mockReturnValue(PORTRAIT_PHONE);

        // When the layout renders
        renderLayout();
        await waitForBatchedUpdatesWithAct();

        // Then the body and the main column grow into free space but keep their content height as the basis (no `flex: 1`,
        // whose zero basis and shrinking would collapse the amount), so missing height overflows into the root scroll view
        expect(StyleSheet.flatten(screen.getByTestId(BODY_TEST_ID).props.style)).toMatchObject({flexGrow: 1});
        expect(StyleSheet.flatten(screen.getByTestId(BODY_TEST_ID).props.style)).not.toHaveProperty('flex');
        expect(StyleSheet.flatten(screen.getByTestId(MAIN_TEST_ID).props.style)).toMatchObject({flexGrow: 1});
        expect(StyleSheet.flatten(screen.getByTestId(MAIN_TEST_ID).props.style)).not.toHaveProperty('flex');
        expect(StyleSheet.flatten(screen.getByTestId(ROOT_TEST_ID).props.contentContainerStyle)).toMatchObject({flexGrow: 1});

        // Then the amount container inside the main column only grows too, so its height counts toward the main column's
        // basis instead of contributing nothing and overlapping the pad
        expect(screen.getByTestId(CONTAINER_TEST_ID)).toHaveStyle({flexGrow: 1});
        expect(screen.getByTestId(CONTAINER_TEST_ID)).not.toHaveStyle({flex: 1});
    });

    it('renders two columns in a scrollable row with the footer pinned outside it on phones in landscape', async () => {
        // Given a phone in landscape, the only case that splits the screen into two columns
        mockWindowDimensions.mockReturnValue(LANDSCAPE_PHONE);

        // When the layout renders
        renderLayout();
        await waitForBatchedUpdatesWithAct();

        // Then the body is a scroll view laying the main column and the pad side by side
        const body = screen.getByTestId(BODY_TEST_ID);
        expect(StyleSheet.flatten(body.props.contentContainerStyle)).toMatchObject({flexDirection: 'row'});
        expect(body).toContainElement(screen.getByTestId(MAIN_TEST_ID));
        expect(body).toContainElement(screen.getByTestId(PAD_TEST_ID));

        // Then the footer stays outside the scrolling body, so it remains visible
        expect(body).not.toContainElement(screen.getByTestId(FOOTER_TEST_ID));
        expect(screen.getByTestId(ROOT_TEST_ID).props.contentContainerStyle).toBeUndefined();

        // Then the main column is centred in the row at its content height rather than stretched to the row's height, so the
        // growing amount container has no free space to push the actions and error down to the bottom of the screen
        expect(screen.getByTestId(MAIN_TEST_ID)).toHaveStyle({alignSelf: 'center', width: 400});
    });

    it('switches between one and two columns when the phone rotates', async () => {
        // Given the layout rendered on a phone in portrait, as a single scrollable column
        const {rerender} = renderLayout();
        await waitForBatchedUpdatesWithAct();
        expect(screen.getByTestId(ROOT_TEST_ID)).toContainElement(screen.getByTestId(FOOTER_TEST_ID));

        // When the phone rotates to landscape
        mockWindowDimensions.mockReturnValue(LANDSCAPE_PHONE);
        rerender(getLayout());
        await waitForBatchedUpdatesWithAct();

        // Then the body becomes the scrollable row and the footer is pinned outside it
        const body = screen.getByTestId(BODY_TEST_ID);
        expect(StyleSheet.flatten(body.props.contentContainerStyle)).toMatchObject({flexDirection: 'row'});
        expect(body).not.toContainElement(screen.getByTestId(FOOTER_TEST_ID));

        // When the phone rotates back to portrait
        mockWindowDimensions.mockReturnValue(PORTRAIT_PHONE);
        rerender(getLayout());
        await waitForBatchedUpdatesWithAct();

        // Then the root is the scroll view again, holding the footer
        expect(screen.getByTestId(ROOT_TEST_ID).props.contentContainerStyle).toBeDefined();
        expect(screen.getByTestId(BODY_TEST_ID).props.contentContainerStyle).toBeUndefined();
    });

    it('leaves the bottom spacing to the screen edge when a footer follows the pad in a single column', async () => {
        // Given a phone in portrait, where the pad and the footer stack at the bottom of the column
        mockWindowDimensions.mockReturnValue(PORTRAIT_PHONE);

        // When the layout renders a footer below the pad
        renderLayout(undefined, {hasFooter: true});
        await waitForBatchedUpdatesWithAct();

        // Then the pad keeps the small gap above it and its side padding, but no bottom padding that would sit between the keys and the footer
        expect(StyleSheet.flatten(screen.getByTestId(PAD_TEST_ID).props.style)).toMatchObject({marginTop: 8, paddingHorizontal: 20, alignItems: 'center'});
        expect(StyleSheet.flatten(screen.getByTestId(PAD_TEST_ID).props.style)).not.toHaveProperty('paddingBottom');

        // Then the centered footer adds no bottom padding either, because the scroll view at the screen edge owns it
        expect(StyleSheet.flatten(screen.getByTestId(FOOTER_TEST_ID).props.style)).toMatchObject({alignItems: 'center', paddingHorizontal: 20});
        expect(StyleSheet.flatten(screen.getByTestId(FOOTER_TEST_ID).props.style)).not.toHaveProperty('paddingBottom');
        expect(StyleSheet.flatten(screen.getByTestId(ROOT_TEST_ID).props.contentContainerStyle)).toMatchObject({paddingBottom: 20});
    });

    it('keeps the same bottom spacing below the pad when no footer follows it', async () => {
        // Given a phone in portrait and a screen whose submit button sits outside the layout (e.g. a FormProvider)
        mockWindowDimensions.mockReturnValue(PORTRAIT_PHONE);

        // When the layout renders without a footer
        renderLayout(undefined, {hasFooter: false});
        await waitForBatchedUpdatesWithAct();

        // Then the scroll view still pads the bottom of the screen, so the keys never touch the content under the layout
        expect(StyleSheet.flatten(screen.getByTestId(PAD_TEST_ID).props.style)).not.toHaveProperty('paddingBottom');
        expect(StyleSheet.flatten(screen.getByTestId(ROOT_TEST_ID).props.contentContainerStyle)).toMatchObject({paddingBottom: 20});
    });

    it('pads the footer itself in two columns, where it sits outside the scroll view', async () => {
        // Given a phone in landscape, where the footer is pinned below the scrollable columns
        mockWindowDimensions.mockReturnValue(LANDSCAPE_PHONE);

        // When the layout renders a footer
        renderLayout(undefined, {hasFooter: true});
        await waitForBatchedUpdatesWithAct();

        // Then the footer owns the bottom spacing, since no scroll view sits below it
        expect(StyleSheet.flatten(screen.getByTestId(FOOTER_TEST_ID).props.style)).toMatchObject({alignItems: 'center', paddingBottom: 20});
    });

    it('keeps the input focused when pressing an empty area of the layout', async () => {
        // Given an input with a highlighted range, so the refocus has a selection to collapse
        const inputRef = React.createRef<BaseTextInputRef>();
        renderLayout(inputRef);
        await waitForBatchedUpdatesWithAct();

        const input = screen.getByTestId(INPUT_TEST_ID);
        fireEvent(input, 'selectionChange', {nativeEvent: {selection: {start: 0, end: 2}}});
        await waitForBatchedUpdatesWithAct();

        if (!inputRef.current) {
            throw new Error('Numeric input ref was not assigned');
        }
        const focusSpy = jest.spyOn(inputRef.current, 'focus');

        // When pressing the empty area around the footer, which bubbles up to the layout root
        const event = createMouseDownEvent(document.createElement('div'));
        fireEvent(screen.getByTestId(FOOTER_TEST_ID), 'mouseDown', event);
        await waitForBatchedUpdatesWithAct();

        // Then the browser blur is prevented, the selection collapses, and the input is refocused
        expect(event.preventDefault).toHaveBeenCalledTimes(1);
        expect(input.props.selection).toEqual({start: 2, end: 2});
        expect(focusSpy).toHaveBeenCalledTimes(1);
        focusSpy.mockRestore();
    });

    it('keeps the input focused when pressing an empty area of the two-column layout', async () => {
        // Given a phone in landscape, where the layout root is a plain view instead of the scroll view
        mockWindowDimensions.mockReturnValue(LANDSCAPE_PHONE);
        const inputRef = React.createRef<BaseTextInputRef>();
        renderLayout(inputRef);
        await waitForBatchedUpdatesWithAct();

        const input = screen.getByTestId(INPUT_TEST_ID);
        fireEvent(input, 'selectionChange', {nativeEvent: {selection: {start: 0, end: 2}}});
        await waitForBatchedUpdatesWithAct();

        if (!inputRef.current) {
            throw new Error('Numeric input ref was not assigned');
        }
        const focusSpy = jest.spyOn(inputRef.current, 'focus');

        // When pressing the empty area around the pinned footer
        const event = createMouseDownEvent(document.createElement('div'));
        fireEvent(screen.getByTestId(FOOTER_TEST_ID), 'mouseDown', event);
        await waitForBatchedUpdatesWithAct();

        // Then the two-column root refocuses the input the same way the single column does
        expect(event.preventDefault).toHaveBeenCalledTimes(1);
        expect(input.props.selection).toEqual({start: 2, end: 2});
        expect(focusSpy).toHaveBeenCalledTimes(1);
        focusSpy.mockRestore();
    });

    it('keeps the input focused when pressing the padding around the number pad', async () => {
        // Given an input with a highlighted range, so the refocus has a selection to collapse
        const inputRef = React.createRef<BaseTextInputRef>();
        renderLayout(inputRef);
        await waitForBatchedUpdatesWithAct();

        const input = screen.getByTestId(INPUT_TEST_ID);
        fireEvent(input, 'selectionChange', {nativeEvent: {selection: {start: 0, end: 2}}});
        await waitForBatchedUpdatesWithAct();

        if (!inputRef.current) {
            throw new Error('Numeric input ref was not assigned');
        }
        const focusSpy = jest.spyOn(inputRef.current, 'focus');

        // When pressing the pad slot's padding, which the pad primitive does not own and which bubbles up to the layout root
        const event = createMouseDownEvent(document.createElement('div'));
        fireEvent(screen.getByTestId(PAD_TEST_ID), 'mouseDown', event);
        await waitForBatchedUpdatesWithAct();

        // Then the browser blur is prevented like in the legacy form, the selection collapses, and the input is refocused
        expect(event.preventDefault).toHaveBeenCalledTimes(1);
        expect(input.props.selection).toEqual({start: 2, end: 2});
        expect(focusSpy).toHaveBeenCalledTimes(1);
        focusSpy.mockRestore();
    });

    it('collapses the selection without focusing again when the input is already focused', async () => {
        // Given an input that is already focused and has a highlighted range
        const inputRef = React.createRef<BaseTextInputRef>();
        renderLayout(inputRef);
        await waitForBatchedUpdatesWithAct();

        const input = screen.getByTestId(INPUT_TEST_ID);
        fireEvent(input, 'selectionChange', {nativeEvent: {selection: {start: 0, end: 2}}});
        await waitForBatchedUpdatesWithAct();

        const inputElement = inputRef.current;
        if (!inputElement || !isFocusableInput(inputElement)) {
            throw new Error('Numeric input ref was not assigned to a focusable input');
        }
        const isFocusedSpy = jest.spyOn(inputElement, 'isFocused').mockReturnValue(true);
        const focusSpy = jest.spyOn(inputElement, 'focus');

        // When pressing an empty area of the layout
        const event = createMouseDownEvent(document.createElement('div'));
        fireEvent(screen.getByTestId(FOOTER_TEST_ID), 'mouseDown', event);
        await waitForBatchedUpdatesWithAct();

        // Then the browser blur is still prevented and the selection collapses, but focus is not requested twice
        expect(event.preventDefault).toHaveBeenCalledTimes(1);
        expect(input.props.selection).toEqual({start: 2, end: 2});
        expect(focusSpy).not.toHaveBeenCalled();
        isFocusedSpy.mockRestore();
        focusSpy.mockRestore();
    });

    it.each([
        ['a button', () => document.createElement('button')],
        [
            'an element with the button role',
            () => {
                const element = document.createElement('div');
                element.setAttribute('role', 'button');
                return element;
            },
        ],
        ['the input', () => document.createElement('input')],
        ['a text area', () => document.createElement('textarea')],
        [
            'a link',
            () => {
                const element = document.createElement('a');
                element.setAttribute('href', '#');
                return element;
            },
        ],
        [
            'an element with the link role',
            () => {
                const element = document.createElement('div');
                element.setAttribute('role', 'link');
                return element;
            },
        ],
        [
            'an editable element',
            () => {
                const element = document.createElement('div');
                element.setAttribute('contenteditable', 'true');
                return element;
            },
        ],
        [
            'an element nested inside a button',
            () => {
                const button = document.createElement('button');
                const label = document.createElement('span');
                button.appendChild(label);
                return label;
            },
        ],
    ])('does not interfere when pressing %s', async (_, createTarget) => {
        // Given the layout, whose root listens to every mouse down bubbling from its parts
        renderLayout();
        await waitForBatchedUpdatesWithAct();

        // When pressing an interactive element inside the layout
        const event = createMouseDownEvent(createTarget());
        fireEvent(screen.getByTestId(FOOTER_TEST_ID), 'mouseDown', event);
        await waitForBatchedUpdatesWithAct();

        // Then its default behavior is kept, so the press reaches it
        expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it.each([
        ['there is no target', () => undefined],
        ['the target is a text node', () => document.createTextNode('12.5')],
    ])('ignores the press when %s', async (_, createTarget) => {
        // Given the layout, which can only tell interactive elements apart on HTML elements
        const inputRef = React.createRef<BaseTextInputRef>();
        renderLayout(inputRef);
        await waitForBatchedUpdatesWithAct();

        if (!inputRef.current) {
            throw new Error('Numeric input ref was not assigned');
        }
        const focusSpy = jest.spyOn(inputRef.current, 'focus');

        // When a mouse down without an HTML element target bubbles up to the layout root
        const event = createMouseDownEvent(createTarget());
        fireEvent(screen.getByTestId(FOOTER_TEST_ID), 'mouseDown', event);
        await waitForBatchedUpdatesWithAct();

        // Then the root leaves the default behavior and the focus alone instead of guessing
        expect(event.preventDefault).not.toHaveBeenCalled();
        expect(focusSpy).not.toHaveBeenCalled();
        focusSpy.mockRestore();
    });

    it('does not refocus again when a primitive already handled the press', async () => {
        // Given the layout and a mouse down that a primitive (Container or BigNumberPad) already prevented
        renderLayout();
        await waitForBatchedUpdatesWithAct();
        const event = {...createMouseDownEvent(document.createElement('div')), isDefaultPrevented: () => true};

        // When the event bubbles up to the layout root
        fireEvent(screen.getByTestId(MAIN_TEST_ID), 'mouseDown', event);
        await waitForBatchedUpdatesWithAct();

        // Then the root leaves it alone
        expect(event.preventDefault).not.toHaveBeenCalled();
    });
});
