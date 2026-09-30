import {act, fireEvent, render, screen} from '@testing-library/react-native';

import ComposeProviders from '@components/ComposeProviders';
import {LocaleContextProvider} from '@components/LocaleContextProvider';
import type {NumericEditingRef} from '@components/NumericEditingController';
import NumericInput, {useNumericDynamicFontSize, useNumericInputActions} from '@components/NumericInput';
import OnyxListItemProvider from '@components/OnyxListItemProvider';
import {PressableWithoutFeedback} from '@components/Pressable';
import Text from '@components/Text';

import variables from '@styles/variables';

import CONST from '@src/CONST';

import type * as NativeNavigation from '@react-navigation/native';

import React from 'react';

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<typeof NativeNavigation>('@react-navigation/native'),
    useIsFocused: jest.fn(() => true),
    useNavigation: jest.fn(() => ({
        navigate: jest.fn(),
        addListener: jest.fn(() => jest.fn()),
    })),
}));

type UncontrolledSignNumericInputProps = Omit<React.ComponentProps<typeof NumericInput>, 'isNegative' | 'onSignChange'>;

const INPUT_TEST_ID = 'numeric-text-input';
const MINUS_SIGN = '-';

function Providers({children}: {children: React.ReactNode}) {
    return <ComposeProviders components={[OnyxListItemProvider, LocaleContextProvider]}>{children}</ComposeProviders>;
}

/** Renders inside the app providers, which a later `screen.rerender` keeps. */
function renderWithProviders(children: React.ReactElement) {
    return render(children, {wrapper: Providers});
}

/** Selects the whole displayed magnitude, as a select-all before a paste does. */
function selectAll(input: ReturnType<typeof screen.getByTestId>, length: number) {
    fireEvent(input, 'selectionChange', {nativeEvent: {selection: {start: 0, end: length}}});
}

function ToggleSignTrigger() {
    const {toggleSign} = useNumericInputActions();

    return (
        <PressableWithoutFeedback
            accessibilityLabel="Toggle sign"
            testID="toggle-sign"
            onPress={toggleSign}
        />
    );
}

describe('NumericInput', () => {
    const onInputChange = jest.fn();

    const renderNumericInput = (props: Partial<UncontrolledSignNumericInputProps> = {}, children?: React.ReactNode) =>
        renderWithProviders(
            <NumericInput
                onInputChange={onInputChange}
                decimals={2}
                {...props}
            >
                {children ?? (
                    <>
                        <NumericInput.MinusSign />
                        <NumericInput.Symbol>$</NumericInput.Symbol>
                        <NumericInput.TextInput testID={INPUT_TEST_ID} />
                    </>
                )}
            </NumericInput>,
        );

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('symbol primitive', () => {
        it('renders its children as a passive symbol', () => {
            renderNumericInput({value: '12'}, <NumericInput.Symbol>km</NumericInput.Symbol>);

            expect(screen.getByText('km')).toBeOnTheScreen();
        });
    });

    describe('sign handling', () => {
        it('renders a negative value as a separate sign and editable magnitude', () => {
            renderNumericInput({value: '-12', allowNegative: true});

            expect(screen.getByText(MINUS_SIGN)).toBeOnTheScreen();
            expect(screen.getByTestId(INPUT_TEST_ID)).toHaveDisplayValue('12');
        });

        it('keeps a negative value in the input when negative values are not allowed', () => {
            renderNumericInput({value: '-12'});

            expect(screen.queryByText(MINUS_SIGN)).not.toBeOnTheScreen();
            expect(screen.getByTestId(INPUT_TEST_ID)).toHaveDisplayValue('-12');
        });

        it('preserves the sign when the magnitude is edited', () => {
            renderNumericInput({value: '-12', allowNegative: true});

            fireEvent.changeText(screen.getByTestId(INPUT_TEST_ID), '123');

            expect(onInputChange).toHaveBeenCalledWith('-123');
        });

        it('keeps the sign when the magnitude is cleared, so a further backspace clears it', () => {
            renderNumericInput({value: '-12', allowNegative: true});

            const input = screen.getByTestId(INPUT_TEST_ID);
            fireEvent.changeText(input, '');

            expect(screen.getByText(MINUS_SIGN)).toBeOnTheScreen();
            expect(input).toHaveDisplayValue('');
            expect(onInputChange).toHaveBeenLastCalledWith('-');

            fireEvent(input, 'keyPress', {nativeEvent: {key: 'Backspace'}});

            expect(screen.queryByText(MINUS_SIGN)).not.toBeOnTheScreen();
            expect(onInputChange).toHaveBeenLastCalledWith('');
        });

        it('toggles the sign when a minus is typed into the input', () => {
            renderNumericInput({value: '-12', allowNegative: true});

            const input = screen.getByTestId(INPUT_TEST_ID);
            fireEvent(input, 'selectionChange', {nativeEvent: {selection: {start: 0, end: 0}}});
            fireEvent.changeText(input, '-12');

            expect(screen.queryByText(MINUS_SIGN)).not.toBeOnTheScreen();
            expect(input).toHaveDisplayValue('12');
            expect(onInputChange).toHaveBeenLastCalledWith('12');
        });

        it('rejects a minus typed at an invalid position', () => {
            renderNumericInput({value: '-12', allowNegative: true});

            const input = screen.getByTestId(INPUT_TEST_ID);
            // With the caret at the end, the typed minus produces "12-", which the validator rejects.
            fireEvent.changeText(input, '12-');

            expect(onInputChange).not.toHaveBeenCalled();
        });

        it.each([
            ['50', '50'],
            // The digits of the pasted value must not decide the outcome, so a shared leading digit changes nothing.
            ['15', '15'],
        ])('clears the sign when the pasted positive value %s replaces the whole number', (pastedText, expectedValue) => {
            renderNumericInput({value: '-12', allowNegative: true});

            const input = screen.getByTestId(INPUT_TEST_ID);
            selectAll(input, 2);
            fireEvent.changeText(input, pastedText);

            expect(screen.queryByText(MINUS_SIGN)).not.toBeOnTheScreen();
            expect(onInputChange).toHaveBeenLastCalledWith(expectedValue);
        });

        it('keeps the sign when a pasted positive value replaces only part of the number', () => {
            renderNumericInput({value: '-12', allowNegative: true});

            const input = screen.getByTestId(INPUT_TEST_ID);
            fireEvent(input, 'selectionChange', {nativeEvent: {selection: {start: 1, end: 1}}});
            fireEvent.changeText(input, '1502');

            expect(screen.getByText(MINUS_SIGN)).toBeOnTheScreen();
            expect(onInputChange).toHaveBeenLastCalledWith('-1502');
        });

        it('keeps the sign when digits are appended to a fully selected empty magnitude', () => {
            renderNumericInput({value: '-', allowNegative: true});

            const input = screen.getByTestId(INPUT_TEST_ID);
            selectAll(input, 0);
            fireEvent.changeText(input, '5');

            expect(screen.getByText(MINUS_SIGN)).toBeOnTheScreen();
            expect(onInputChange).toHaveBeenLastCalledWith('-5');
        });

        it('takes the sign from a pasted negative value', () => {
            renderNumericInput({value: '12', allowNegative: true});

            fireEvent.changeText(screen.getByTestId(INPUT_TEST_ID), '-50');

            expect(screen.getByText(MINUS_SIGN)).toBeOnTheScreen();
            expect(onInputChange).toHaveBeenLastCalledWith('-50');
        });

        it('keeps the sign when a negative value is pasted onto a negative value, because a paste never toggles', () => {
            renderNumericInput({value: '-12', allowNegative: true});
            const input = screen.getByTestId(INPUT_TEST_ID);

            fireEvent.changeText(input, '-50');
            fireEvent.changeText(input, '-50');

            expect(screen.getByText(MINUS_SIGN)).toBeOnTheScreen();
            expect(input).toHaveDisplayValue('50');
        });

        it('clears a standalone minus when backspace is pressed on an empty input', () => {
            renderNumericInput({value: '-', allowNegative: true});

            fireEvent(screen.getByTestId(INPUT_TEST_ID), 'keyPress', {nativeEvent: {key: 'Backspace'}});

            expect(screen.queryByText(MINUS_SIGN)).not.toBeOnTheScreen();
            expect(onInputChange).toHaveBeenCalledWith('');
        });

        it('clears the minus sign when backspace is pressed with caret at the start of a non-empty negative input', () => {
            renderNumericInput({value: '-1.23', allowNegative: true});
            const input = screen.getByTestId(INPUT_TEST_ID);

            expect(screen.getByText(MINUS_SIGN)).toBeOnTheScreen();
            expect(input).toHaveDisplayValue('1.23');

            // Position caret before the first digit ("-|1.23")
            fireEvent(input, 'selectionChange', {nativeEvent: {selection: {start: 0, end: 0}}});
            fireEvent(input, 'keyPress', {nativeEvent: {key: 'Backspace'}});

            // Minus sign is removed, value becomes positive
            expect(screen.queryByText(MINUS_SIGN)).not.toBeOnTheScreen();
            expect(input).toHaveDisplayValue('1.23');
            expect(onInputChange).toHaveBeenLastCalledWith('1.23');

            // Pressing backspace again at the start does nothing because the sign is already gone
            fireEvent(input, 'keyPress', {nativeEvent: {key: 'Backspace'}});
            expect(screen.queryByText(MINUS_SIGN)).not.toBeOnTheScreen();
            expect(input).toHaveDisplayValue('1.23');
            expect(onInputChange).toHaveBeenCalledTimes(1);
        });

        it('does not clear anything when backspace is pressed with caret at the start of a positive input', () => {
            renderNumericInput({value: '1.23', allowNegative: true});
            const input = screen.getByTestId(INPUT_TEST_ID);

            expect(screen.queryByText(MINUS_SIGN)).not.toBeOnTheScreen();
            expect(input).toHaveDisplayValue('1.23');

            fireEvent(input, 'selectionChange', {nativeEvent: {selection: {start: 0, end: 0}}});
            fireEvent(input, 'keyPress', {nativeEvent: {key: 'Backspace'}});

            expect(screen.queryByText(MINUS_SIGN)).not.toBeOnTheScreen();
            expect(input).toHaveDisplayValue('1.23');
            expect(onInputChange).not.toHaveBeenCalled();
        });

        it('does not clear the minus sign when backspace is pressed on a non-collapsed selection starting at 0', () => {
            renderNumericInput({value: '-12.34', allowNegative: true});
            const input = screen.getByTestId(INPUT_TEST_ID);

            expect(screen.getByText(MINUS_SIGN)).toBeOnTheScreen();

            // Select "12" (range 0..2)
            fireEvent(input, 'selectionChange', {nativeEvent: {selection: {start: 0, end: 2}}});
            fireEvent(input, 'keyPress', {nativeEvent: {key: 'Backspace'}});

            // Since selection is not collapsed, the minus sign should not be cleared by the keypress handler
            expect(screen.getByText(MINUS_SIGN)).toBeOnTheScreen();
            expect(onInputChange).not.toHaveBeenCalled();
        });

        it('toggles the sign and notifies the parent with the signed value', () => {
            renderNumericInput(
                {value: '12', allowNegative: true},
                <>
                    <NumericInput.MinusSign />
                    <ToggleSignTrigger />
                </>,
            );

            fireEvent.press(screen.getByTestId('toggle-sign'));

            expect(screen.getByText(MINUS_SIGN)).toBeOnTheScreen();
            expect(onInputChange).toHaveBeenLastCalledWith('-12');
        });

        it('ignores a sign toggle when negative values are not allowed', () => {
            renderNumericInput(
                {value: '12'},
                <>
                    <NumericInput.MinusSign />
                    <ToggleSignTrigger />
                </>,
            );

            fireEvent.press(screen.getByTestId('toggle-sign'));

            expect(screen.queryByText(MINUS_SIGN)).not.toBeOnTheScreen();
            expect(onInputChange).not.toHaveBeenCalled();
        });
    });

    describe('caller-owned sign', () => {
        const onSignChange = jest.fn();

        it('shows the caller sign beside the magnitude the caller passes', () => {
            // Given a caller that keeps a negative sign apart from the magnitude
            renderWithProviders(
                <NumericInput
                    value="12"
                    isNegative
                    onSignChange={onSignChange}
                    onInputChange={onInputChange}
                    allowNegative
                    decimals={2}
                >
                    <NumericInput.MinusSign />
                    <NumericInput.TextInput testID={INPUT_TEST_ID} />
                </NumericInput>,
            );

            // Then the minus renders beside the magnitude, as it does for a signed value
            expect(screen.getByText(MINUS_SIGN)).toBeOnTheScreen();
            expect(screen.getByTestId(INPUT_TEST_ID)).toHaveDisplayValue('12');
        });

        it('reports only the magnitude when a digit is typed', () => {
            // Given a negative caller-owned amount
            renderWithProviders(
                <NumericInput
                    value="12"
                    isNegative
                    onSignChange={onSignChange}
                    onInputChange={onInputChange}
                    allowNegative
                    decimals={2}
                >
                    <NumericInput.MinusSign />
                    <NumericInput.TextInput testID={INPUT_TEST_ID} />
                </NumericInput>,
            );

            // When the user types a digit
            fireEvent.changeText(screen.getByTestId(INPUT_TEST_ID), '123');

            // Then the caller receives the magnitude and keeps its sign, because an edit of the digits never changes the sign
            expect(onInputChange).toHaveBeenLastCalledWith('123');
            expect(onSignChange).not.toHaveBeenCalled();
            expect(screen.getByText(MINUS_SIGN)).toBeOnTheScreen();
        });

        it('reports the new sign when the sign is flipped', () => {
            // Given a positive caller-owned amount
            renderWithProviders(
                <NumericInput
                    value="12"
                    isNegative={false}
                    onSignChange={onSignChange}
                    onInputChange={onInputChange}
                    allowNegative
                    decimals={2}
                >
                    <NumericInput.MinusSign />
                    <ToggleSignTrigger />
                </NumericInput>,
            );

            // When the sign is flipped
            fireEvent.press(screen.getByTestId('toggle-sign'));

            // Then the caller learns the new sign, and the unchanged magnitude is not reported again
            expect(onSignChange).toHaveBeenCalledWith(true);
            expect(onInputChange).not.toHaveBeenCalled();
            expect(screen.getByText(MINUS_SIGN)).toBeOnTheScreen();
        });

        it('reports a positive sign when Backspace removes the minus', () => {
            // Given a negative caller-owned amount with the caret before the digits
            renderWithProviders(
                <NumericInput
                    value="5"
                    isNegative
                    onSignChange={onSignChange}
                    onInputChange={onInputChange}
                    allowNegative
                    decimals={2}
                >
                    <NumericInput.MinusSign />
                    <NumericInput.TextInput testID={INPUT_TEST_ID} />
                </NumericInput>,
            );
            const input = screen.getByTestId(INPUT_TEST_ID);
            fireEvent(input, 'selectionChange', {nativeEvent: {selection: {start: 0, end: 0}}});

            // When the user presses Backspace, which at caret 0 can only delete the sign
            fireEvent(input, 'keyPress', {nativeEvent: {key: 'Backspace'}});

            // Then the caller learns the amount is positive, and the magnitude stays
            expect(onSignChange).toHaveBeenCalledWith(false);
            expect(onInputChange).toHaveBeenLastCalledWith('5');
            expect(screen.queryByText(MINUS_SIGN)).not.toBeOnTheScreen();
            expect(input).toHaveDisplayValue('5');
        });

        it('adopts a sign the caller changes on its own', () => {
            // Given a positive caller-owned amount
            renderWithProviders(
                <NumericInput
                    value="12"
                    isNegative={false}
                    onSignChange={onSignChange}
                    onInputChange={onInputChange}
                    allowNegative
                    decimals={2}
                >
                    <NumericInput.MinusSign />
                    <NumericInput.TextInput testID={INPUT_TEST_ID} />
                </NumericInput>,
            );

            // When the caller makes the amount negative
            screen.rerender(
                <NumericInput
                    value="12"
                    isNegative
                    onSignChange={onSignChange}
                    onInputChange={onInputChange}
                    allowNegative
                    decimals={2}
                >
                    <NumericInput.MinusSign />
                    <NumericInput.TextInput testID={INPUT_TEST_ID} />
                </NumericInput>,
            );

            // Then the minus appears without a report back, because the caller already knows its sign
            expect(screen.getByText(MINUS_SIGN)).toBeOnTheScreen();
            expect(screen.getByTestId(INPUT_TEST_ID)).toHaveDisplayValue('12');
            expect(onSignChange).not.toHaveBeenCalled();
            expect(onInputChange).not.toHaveBeenCalled();
        });

        it('exchanges magnitudes through the ref and keeps the caller sign', () => {
            // Given a negative caller-owned amount and a root ref
            const ref = React.createRef<NumericEditingRef>();
            renderWithProviders(
                <NumericInput
                    value="12"
                    isNegative
                    onSignChange={onSignChange}
                    onInputChange={onInputChange}
                    allowNegative
                    decimals={2}
                    ref={ref}
                >
                    <NumericInput.MinusSign />
                    <NumericInput.TextInput testID={INPUT_TEST_ID} />
                </NumericInput>,
            );

            // Then the ref reads the magnitude, the same shape the caller passes in
            expect(ref.current?.getNumber()).toBe('12');

            // When the caller replaces the magnitude imperatively
            act(() => {
                ref.current?.updateNumber('7');
            });

            // Then the new magnitude keeps the caller's sign, and nothing is reported back
            expect(ref.current?.getNumber()).toBe('7');
            expect(screen.getByText(MINUS_SIGN)).toBeOnTheScreen();
            expect(screen.getByTestId(INPUT_TEST_ID)).toHaveDisplayValue('7');
            expect(onSignChange).not.toHaveBeenCalled();
            expect(onInputChange).not.toHaveBeenCalled();
        });

        it('reports the sign of a signed value set through the ref', () => {
            // Given a positive caller-owned amount and a root ref
            const ref = React.createRef<NumericEditingRef>();
            renderWithProviders(
                <NumericInput
                    value="12"
                    isNegative={false}
                    onSignChange={onSignChange}
                    onInputChange={onInputChange}
                    allowNegative
                    decimals={2}
                    ref={ref}
                >
                    <NumericInput.MinusSign />
                    <NumericInput.TextInput testID={INPUT_TEST_ID} />
                </NumericInput>,
            );

            // When a caller sets a signed value imperatively, as legacy amount forms still do
            act(() => {
                ref.current?.updateNumber('-7');
            });

            // Then the root takes the sign apart and reports it, so the caller's sign follows the value
            expect(onSignChange).toHaveBeenCalledWith(true);
            expect(ref.current?.getNumber()).toBe('7');
            expect(screen.getByText(MINUS_SIGN)).toBeOnTheScreen();
        });
    });

    describe('text input primitive', () => {
        it('commits a valid edit through the root and displays it', () => {
            // Given a composition with two accepted decimal places and value "12"
            renderNumericInput({value: '12'});

            // When the user appends a decimal fraction
            fireEvent.changeText(screen.getByTestId(INPUT_TEST_ID), '12.5');

            // Then the root is notified and the input displays the committed value
            expect(onInputChange).toHaveBeenLastCalledWith('12.5');
            expect(screen.getByTestId(INPUT_TEST_ID)).toHaveDisplayValue('12.5');
        });

        it('moves the caret to the end of the value after an edit', () => {
            // Given a composition with value "12" and the caret at the end
            renderNumericInput({value: '12'});

            const input = screen.getByTestId(INPUT_TEST_ID);
            fireEvent(input, 'selectionChange', {
                nativeEvent: {selection: {start: 2, end: 2}},
            });

            // When a digit is appended
            fireEvent.changeText(input, '123');

            // Then the caret follows the appended digit
            expect(input.props.selection).toEqual({start: 3, end: 3});
        });

        it('ignores the stale selection event native echoes after an edit', () => {
            // Given a composition with value "12"
            renderNumericInput({value: '12'});

            // When a digit is appended and native echoes the pre-edit caret position
            const input = screen.getByTestId(INPUT_TEST_ID);
            fireEvent.changeText(input, '123');
            fireEvent(input, 'selectionChange', {nativeEvent: {selection: {start: 0, end: 0}}});

            // Then the echo is dropped and the caret stays where the edit put it
            expect(input.props.selection).toEqual({start: 3, end: 3});
        });

        it('rejects an edit that exceeds the accepted number of decimals', () => {
            // Given a composition with two accepted decimal places and value "1.23"
            renderNumericInput({value: '1.23'});

            // When the user types a third decimal place
            fireEvent.changeText(screen.getByTestId(INPUT_TEST_ID), '1.234');

            // Then the edit is rejected and the displayed value is unchanged
            expect(onInputChange).not.toHaveBeenCalled();
            expect(screen.getByTestId(INPUT_TEST_ID)).toHaveDisplayValue('1.23');
        });

        it('strips decimals from an in-progress value when the accepted decimals decrease', () => {
            // Given an empty composition whose in-progress value has two decimal places
            const {rerender} = renderNumericInput({value: ''});
            fireEvent.changeText(screen.getByTestId(INPUT_TEST_ID), '1.23');

            // When the accepted number of decimals drops to zero
            rerender(
                <NumericInput
                    onInputChange={onInputChange}
                    decimals={0}
                    value=""
                >
                    <NumericInput.TextInput testID={INPUT_TEST_ID} />
                </NumericInput>,
            );

            // Then the in-progress value is sanitized to the new precision
            expect(screen.getByTestId(INPUT_TEST_ID)).toHaveDisplayValue('1');
        });

        it('preserves the sign when sanitizing a fully selected negative value after the accepted decimals decrease', () => {
            // Given a negative value whose displayed magnitude is fully selected
            const {rerender} = renderNumericInput({value: '-12.55', allowNegative: true});
            const input = screen.getByTestId(INPUT_TEST_ID);
            selectAll(input, 5);

            // When the accepted number of decimals drops to zero
            rerender(
                <NumericInput
                    onInputChange={onInputChange}
                    decimals={0}
                    value="-12.55"
                    allowNegative
                >
                    <NumericInput.MinusSign />
                    <NumericInput.TextInput testID={INPUT_TEST_ID} />
                </NumericInput>,
            );

            // Then sanitization keeps the canonical negative sign
            expect(screen.getByText(MINUS_SIGN)).toBeOnTheScreen();
            expect(screen.getByTestId(INPUT_TEST_ID)).toHaveDisplayValue('12');
            expect(onInputChange).toHaveBeenLastCalledWith('-12');
        });

        it('rejects an edit with more integer digits than the root maxLength allows', () => {
            // Given a composition limited to two integer digits and value "12"
            renderNumericInput({value: '12', maxLength: 2});

            // When the user types a third integer digit
            fireEvent.changeText(screen.getByTestId(INPUT_TEST_ID), '123');

            // Then the edit is rejected and the displayed value is unchanged
            expect(onInputChange).not.toHaveBeenCalled();
            expect(screen.getByTestId(INPUT_TEST_ID)).toHaveDisplayValue('12');
        });

        it('forwards blur and submit to the primitive callbacks', () => {
            // Given a composition where the text input primitive registers blur and submit callbacks
            const onBlur = jest.fn();
            const onSubmitEditing = jest.fn();
            renderNumericInput(
                {value: '12'},
                <NumericInput.TextInput
                    testID={INPUT_TEST_ID}
                    onBlur={onBlur}
                    onSubmitEditing={onSubmitEditing}
                />,
            );

            // When the input is blurred and submitted
            const input = screen.getByTestId(INPUT_TEST_ID);
            fireEvent(input, 'blur');
            fireEvent(input, 'submitEditing');

            // Then each callback runs exactly once
            expect(onBlur).toHaveBeenCalledTimes(1);
            expect(onSubmitEditing).toHaveBeenCalledTimes(1);
        });
    });

    describe('error primitive', () => {
        it('renders the root error where the composition places it', () => {
            renderNumericInput(
                {errorText: 'Invalid amount'},
                <>
                    <NumericInput.TextInput testID={INPUT_TEST_ID} />
                    <NumericInput.Error />
                </>,
            );

            expect(screen.getByText('Invalid amount')).toBeOnTheScreen();
            expect(screen.getByRole(CONST.ROLE.ALERT)).toBeOnTheScreen();
        });

        it('renders nothing when the root has no error', () => {
            renderNumericInput(
                {},
                <>
                    <NumericInput.TextInput testID={INPUT_TEST_ID} />
                    <NumericInput.Error />
                </>,
            );

            expect(screen.queryByRole(CONST.ROLE.ALERT)).not.toBeOnTheScreen();
        });
    });

    describe('useNumericDynamicFontSize', () => {
        function FontSizeReadout({symbol}: {symbol?: string}) {
            const {fontSize} = useNumericDynamicFontSize(symbol);

            return <Text testID="font-size">{String(fontSize)}</Text>;
        }

        it('scales down when the symbol is longer', () => {
            renderNumericInput({value: '1234567890'}, <FontSizeReadout />);
            const withoutSymbolFontSize = Number(screen.getByTestId('font-size').props.children);

            screen.unmount();
            renderNumericInput({value: '1234567890'}, <FontSizeReadout symbol="PLN" />);
            const withSymbolFontSize = Number(screen.getByTestId('font-size').props.children);

            expect(withSymbolFontSize).toBeLessThan(withoutSymbolFontSize);
        });

        it('scales down for negative values, because the sign takes room the input does not display', () => {
            renderNumericInput({value: '1234567890'}, <FontSizeReadout />);
            const positiveFontSize = Number(screen.getByTestId('font-size').props.children);

            screen.unmount();
            renderNumericInput({value: '-1234567890', allowNegative: true}, <FontSizeReadout />);
            const negativeFontSize = Number(screen.getByTestId('font-size').props.children);

            expect(negativeFontSize).toBeLessThan(positiveFontSize);
        });
    });

    describe('amount row', () => {
        function extractFontSize(style: unknown): number | undefined {
            if (!style) {
                return undefined;
            }
            if (Array.isArray(style)) {
                for (let i = style.length - 1; i >= 0; i--) {
                    const nested = extractFontSize(style.at(i));
                    if (nested !== undefined) {
                        return nested;
                    }
                }
                return undefined;
            }
            if (typeof style === 'object' && 'fontSize' in style && typeof style.fontSize === 'number') {
                return style.fontSize;
            }
            return undefined;
        }

        function getElementFontSize(element: {props: unknown}): number | undefined {
            const rawProps: unknown = element.props;
            if (typeof rawProps !== 'object' || rawProps === null || !('style' in rawProps)) {
                return undefined;
            }
            return extractFontSize(rawProps.style);
        }

        it('renders no symbol when none is given', () => {
            // Given an amount row without a symbol
            renderNumericInput({value: '12'}, <NumericInput.AmountRow testID={INPUT_TEST_ID} />);

            // Then only the number renders, because the row adds nothing it was not given
            expect(screen.getByTestId(INPUT_TEST_ID)).toHaveDisplayValue('12');
            expect(screen.queryByText('$')).not.toBeOnTheScreen();
        });

        it('forwards the props it does not consume to the text input', () => {
            // Given an amount row configured with text input behavior a screen relies on
            renderNumericInput(
                {value: '10'},
                <NumericInput.AmountRow
                    testID={INPUT_TEST_ID}
                    accessibilityLabel="Amount (USD)"
                    keyboardType="number-pad"
                    disableKeyboard={false}
                    submitBehavior="blurAndSubmit"
                />,
            );

            // When inspecting the rendered input
            const input = screen.getByTestId(INPUT_TEST_ID);

            // Then the accessibility label, keyboard type, soft keyboard, and submit behavior follow the row's props
            expect(input.props.accessibilityLabel).toBe('Amount (USD)');
            expect(input.props.keyboardType).toBe('number-pad');
            expect(input.props.showSoftInputOnFocus).not.toBe(false);
            expect(input.props.submitBehavior).toBe('blurAndSubmit');
        });

        it('keeps the static font size when dynamic font size is not enabled', () => {
            // Given an amount row with a short amount and dynamic font size left disabled
            renderNumericInput(
                {value: '12'},
                <NumericInput.AmountRow
                    symbol="$"
                    testID={INPUT_TEST_ID}
                />,
            );
            const shortInputFontSize = getElementFontSize(screen.getByTestId(INPUT_TEST_ID));

            screen.unmount();

            // When a long amount is rendered the same way
            renderNumericInput(
                {value: '1234567890123'},
                <NumericInput.AmountRow
                    symbol="$"
                    testID={INPUT_TEST_ID}
                />,
            );
            const longInputFontSize = getElementFontSize(screen.getByTestId(INPUT_TEST_ID));

            // Then the font size does not scale with the length of the amount
            expect(longInputFontSize).toBe(shortInputFontSize);
        });

        it('scales the input and the symbol down together when dynamic font size is enabled', () => {
            // Given an amount row with dynamic font size and a short amount
            renderNumericInput(
                {value: '12', allowNegative: true},
                <NumericInput.AmountRow
                    symbol="$"
                    shouldUseDynamicFontSize
                    testID={INPUT_TEST_ID}
                />,
            );
            const shortInputFontSize = getElementFontSize(screen.getByTestId(INPUT_TEST_ID));
            const shortSymbolFontSize = getElementFontSize(screen.getByText('$'));

            // Then a short amount uses one base size for the symbol and the input
            expect(shortInputFontSize).toBeDefined();
            expect(shortSymbolFontSize).toBe(shortInputFontSize);

            screen.unmount();

            // When a long amount that needs scaling is rendered
            renderNumericInput(
                {value: '1234567890123', allowNegative: true},
                <NumericInput.AmountRow
                    symbol="$"
                    shouldUseDynamicFontSize
                    testID={INPUT_TEST_ID}
                />,
            );
            const longInputFontSize = getElementFontSize(screen.getByTestId(INPUT_TEST_ID));
            const longSymbolFontSize = getElementFontSize(screen.getByText('$'));

            // Then the input and the symbol shrink by the same amount
            expect(longInputFontSize).toBeDefined();
            if (longInputFontSize !== undefined && shortInputFontSize !== undefined) {
                expect(longInputFontSize).toBeLessThan(shortInputFontSize);
            }
            expect(longSymbolFontSize).toBe(longInputFontSize);
        });

        it('counts the minus sign and the symbol length when scaling', () => {
            // Given a positive amount row with dynamic font size
            renderNumericInput(
                {value: '1234567890', allowNegative: true},
                <NumericInput.AmountRow
                    symbol="$"
                    shouldUseDynamicFontSize
                    testID={INPUT_TEST_ID}
                />,
            );
            const positiveFontSize = getElementFontSize(screen.getByTestId(INPUT_TEST_ID));

            screen.unmount();

            // When the same amount is negative, so the minus sign takes room beside it
            renderNumericInput(
                {value: '-1234567890', allowNegative: true},
                <NumericInput.AmountRow
                    symbol="$"
                    shouldUseDynamicFontSize
                    testID={INPUT_TEST_ID}
                />,
            );
            const negativeFontSize = getElementFontSize(screen.getByTestId(INPUT_TEST_ID));
            const minusSignFontSize = getElementFontSize(screen.getByText(MINUS_SIGN));

            // Then the negative amount scales further, and the minus sign matches the input
            expect(positiveFontSize).toBeDefined();
            expect(negativeFontSize).toBeDefined();
            if (negativeFontSize !== undefined && positiveFontSize !== undefined) {
                expect(negativeFontSize).toBeLessThan(positiveFontSize);
            }
            expect(minusSignFontSize).toBe(negativeFontSize);

            screen.unmount();

            // When a longer symbol is rendered beside the positive amount
            renderNumericInput(
                {value: '1234567890', allowNegative: true},
                <NumericInput.AmountRow
                    symbol="PLN"
                    shouldUseDynamicFontSize
                    testID={INPUT_TEST_ID}
                />,
            );
            const longSymbolFontSize = getElementFontSize(screen.getByTestId(INPUT_TEST_ID));

            // Then the longer symbol leaves less room, so the amount scales further
            expect(longSymbolFontSize).toBeDefined();
            if (longSymbolFontSize !== undefined && positiveFontSize !== undefined) {
                expect(longSymbolFontSize).toBeLessThan(positiveFontSize);
            }
        });

        it('leaves directly composed primitives at their static size', () => {
            // Given a long amount composed from the primitives instead of the amount row
            renderNumericInput(
                {value: '1234567890123'},
                <>
                    <NumericInput.Symbol>$</NumericInput.Symbol>
                    <NumericInput.TextInput testID={INPUT_TEST_ID} />
                </>,
            );

            // Then the input keeps its own size, because only the amount row scales the pieces together
            expect(getElementFontSize(screen.getByTestId(INPUT_TEST_ID))).not.toBe(getElementFontSize(screen.getByText('$')));
        });

        it('lets the dynamic font size win over a static font size in the row styles', () => {
            // Given a suffix amount row with dynamic font size and static font sizes, like styles.iouAmountTextInput
            renderNumericInput(
                {value: '0'},
                <NumericInput.AmountRow
                    symbol="hrs"
                    symbolPosition={CONST.TEXT_INPUT_SYMBOL_POSITION.SUFFIX}
                    shouldUseDynamicFontSize
                    style={{fontSize: variables.iouAmountTextSize}}
                    symbolStyle={{fontSize: variables.iouAmountTextSize}}
                    testID={INPUT_TEST_ID}
                />,
            );

            // When inspecting the font sizes
            const inputFontSize = getElementFontSize(screen.getByTestId(INPUT_TEST_ID));
            const symbolFontSize = getElementFontSize(screen.getByText('hrs'));

            // Then the input and the symbol share the dynamic size instead of the static one
            expect(inputFontSize).toBeDefined();
            expect(symbolFontSize).toBe(inputFontSize);
            expect(inputFontSize).not.toBe(variables.iouAmountTextSize);
        });
    });

    describe('root imperative API', () => {
        it('reads and replaces the value without notifying onInputChange', () => {
            // Given a composition holding value "12" and a root ref
            const ref = React.createRef<NumericEditingRef>();
            renderNumericInput({value: '12', ref});

            expect(ref.current?.getNumber()).toBe('12');

            // When the value is replaced imperatively
            act(() => {
                ref.current?.updateNumber('7.5');
            });

            // Then the new value is displayed with the caret at its end, and the root is not notified
            expect(ref.current?.getNumber()).toBe('7.5');
            expect(screen.getByTestId(INPUT_TEST_ID)).toHaveDisplayValue('7.5');
            expect(screen.getByTestId(INPUT_TEST_ID).props.selection).toEqual({start: 3, end: 3});
            expect(onInputChange).not.toHaveBeenCalled();
        });

        it('collapses the selection onto its end when clearSelection is called', () => {
            // Given a composition with a range selection on the input
            const ref = React.createRef<NumericEditingRef>();
            renderNumericInput({value: '1234', ref});

            const input = screen.getByTestId(INPUT_TEST_ID);
            fireEvent(input, 'selectionChange', {
                nativeEvent: {selection: {start: 1, end: 3}},
            });
            expect(input.props.selection).toEqual({start: 1, end: 3});

            // When the selection is cleared imperatively
            act(() => {
                ref.current?.clearSelection();
            });

            // Then the selection collapses onto its end
            expect(input.props.selection).toEqual({start: 3, end: 3});
        });

        it('notifies onInputChange synchronously from toggleSign', () => {
            // Given a negative-capable composition whose parent records whether it was notified inside the toggle call
            let wasParentUpdatedDuringToggle = false;
            let isInsideToggle = false;
            function SynchronousToggleProbe() {
                const {toggleSign} = useNumericInputActions();

                return (
                    <PressableWithoutFeedback
                        accessibilityLabel="Toggle sign synchronously"
                        testID="toggle-sign-sync"
                        onPress={() => {
                            isInsideToggle = true;
                            toggleSign();
                            isInsideToggle = false;
                        }}
                    />
                );
            }
            renderWithProviders(
                <NumericInput
                    value="12"
                    allowNegative
                    onInputChange={() => {
                        wasParentUpdatedDuringToggle = isInsideToggle;
                    }}
                >
                    <SynchronousToggleProbe />
                </NumericInput>,
            );

            // When the sign is toggled
            fireEvent.press(screen.getByTestId('toggle-sign-sync'));

            // Then the parent was notified before toggleSign returned, so it can read the flipped value right after the call
            expect(wasParentUpdatedDuringToggle).toBe(true);
        });
    });
});
