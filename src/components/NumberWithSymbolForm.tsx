import useIsInLandscapeMode from '@hooks/useIsInLandscapeMode';
import usePrevious from '@hooks/usePrevious';
import useThemeStyles from '@hooks/useThemeStyles';

import {canUseTouchScreen as canUseTouchScreenUtil} from '@libs/DeviceCapabilities';

import CONST from '@src/CONST';

import type {ForwardedRef} from 'react';
import type {KeyboardTypeOptions, StyleProp, TextStyle, ViewStyle} from 'react-native';

import {useIsFocused} from '@react-navigation/native';
import React, {useEffect, useImperativeHandle, useRef} from 'react';
import {View} from 'react-native';

import type {NumericFlipButtonProps} from './NumericButtons';
import type {NumericEditingKeyPressEvent, NumericEditingRef} from './NumericEditingController/types';
import type {BaseTextInputRef} from './TextInput/BaseTextInput/types';
import type {TextInputWithSymbolProps} from './TextInputWithSymbol/types';

import {NumericFlipButton as BaseNumericFlipButton} from './NumericButtons';
import NumericField from './NumericField';
import NumericInput from './NumericInput';
import {useNumericInputActions} from './NumericInput/context';
import ScrollView from './ScrollView';

type NumberWithSymbolFormProps = {
    /** Value to display, should already be formatted */
    value?: string;

    /** Callback to update the value in the FormProvider */
    onInputChange?: (number: string) => void;

    decimals?: number;

    /** Currency of the input */
    currency?: string;

    shouldShowBigNumberPad?: boolean;

    /** Footer to display at the bottom of the form */
    footer?: React.ReactNode;

    numberFormRef?: ForwardedRef<NumberWithSymbolFormRef>;

    /** Error to display at the bottom of the form */
    errorText?: string;

    /** Whether the form should use a standard TextInput as a base */
    displayAsTextInput?: boolean;

    /** Custom label for the TextInput */
    label?: string;

    shouldWrapInputInContainer?: boolean;
    scrollViewStyle?: StyleProp<ViewStyle>;

    /** Whether to refocus the input when clicking on the ScrollView empty space */
    shouldRefocusOnScrollViewClick?: boolean;

    /** Whether the amount is negative */
    isNegative?: boolean;

    /** Function to toggle the amount to negative */
    toggleNegative?: () => void;

    /** Function to clear the negative amount */
    clearNegative?: () => void;

    /** Whether to allow flipping amount (shows flip button and enables toggle mechanism) */
    allowFlippingAmount?: boolean;

    /** Whether to allow direct negative input (for split amounts where value is already negative) */
    allowNegativeInput?: boolean;

    negativeSymbolStyle?: StyleProp<TextStyle>;

    /** Whether to use dynamic font size for the amount input */
    shouldUseDynamicFontSize?: boolean;

    /** Whether the input is disabled or not */
    disabled?: boolean;

    ref?: ForwardedRef<BaseTextInputRef>;
    onSubmitEditing?: () => void;
    keyboardType?: KeyboardTypeOptions;
    shouldShowFlipButton?: boolean;

    /** Whether to show the currency selection button */
    shouldShowCurrencyButton?: boolean;

    /** Extra content rendered at the start of the right-hand side, before the flip and currency buttons. `displayAsTextInput` mode only. */
    leadingRightHandSideComponent?: React.ReactNode;

    onCurrencyButtonPress?: () => void;

    /**
     * Label on the trailing dropdown button (e.g. currency code). When set, used instead of `currency` so the same control can show a unit or other suffix.
     */
    currencyButtonLabel?: string;

    /** Accessibility label for the trailing dropdown button (defaults to currency-based copy when unset) */
    currencyButtonAccessibilityLabel?: string;
} & Omit<TextInputWithSymbolProps, 'formattedAmount' | 'onAmountChange' | 'placeholder' | 'onSelectionChange' | 'onKeyPress' | 'onMouseDown' | 'onMouseUp'>;

type NumberWithSymbolFormRef = {
    clearSelection: () => void;
    updateNumber: (newNumber: string) => void;
    getNumber: () => string;
};

const canUseTouchScreen = canUseTouchScreenUtil();

const stripSign = (number: string) => (number.startsWith('-') ? number.slice(1) : number);

type RootFlipButtonProps = Pick<NumericFlipButtonProps, 'style'> & {
    /** Receives the root's own sign toggle so the adapter can flip the canonical value and notify the parent together */
    onFlip: (toggleRootSign: () => void) => void;
};

/** Flip button wired to the NumericInput root, so the minus sign renders from the root's canonical value right away. */
function RootFlipButton({onFlip, style}: RootFlipButtonProps) {
    const {toggleSign} = useNumericInputActions();

    return (
        <BaseNumericFlipButton
            isDisabled={false}
            onPress={() => onFlip(toggleSign)}
            style={style}
        />
    );
}

/**
 * Adapter bridging the legacy NumberWithSymbolForm interface to the composable numeric components.
 * Inline inputs (`displayAsTextInput`, or `shouldWrapInputInContainer={false}` for table cells and split rows) render
 * through NumericField. Full-screen forms render through `NumericInput.ResponsivePreset`, with or without the number pad.
 * The legacy display flags are translated into composition here, so the numeric components never receive them.
 *
 * Transitional: callers should migrate to NumericField (inline fields) or NumericInput (full-screen forms) directly,
 * owning a signed value instead of `isNegative`/`toggleNegative`. This adapter, its parent-owned sign bridge, and the
 * legacy `numberView` test id are removed once no caller is left.
 */
function NumberWithSymbolForm({
    value = '',
    symbol = '',
    currency = '',
    symbolPosition = CONST.TEXT_INPUT_SYMBOL_POSITION.PREFIX,
    hideSymbol = false,
    decimals = 0,
    maxLength,
    errorText,
    onInputChange,
    onSymbolButtonPress,
    isSymbolPressable = true,
    shouldShowBigNumberPad = canUseTouchScreen,
    displayAsTextInput = false,
    footer,
    numberFormRef,
    label,
    style,
    containerStyle,
    symbolTextStyle,
    shouldUseDynamicFontSize = false,
    autoGrow = true,
    disableKeyboard = true,
    prefixCharacter = '',
    hideFocusedState = true,
    shouldApplyPaddingToContainer = false,
    shouldUseDefaultLineHeightForPrefix = true,
    shouldWrapInputInContainer = true,
    scrollViewStyle,
    shouldRefocusOnScrollViewClick = false,
    isNegative = false,
    allowFlippingAmount = false,
    allowNegativeInput = false,
    negativeSymbolStyle,
    toggleNegative,
    clearNegative,
    ref,
    disabled,
    onSubmitEditing,
    shouldShowFlipButton = false,
    shouldShowCurrencyButton = false,
    leadingRightHandSideComponent,
    onCurrencyButtonPress,
    currencyButtonLabel,
    currencyButtonAccessibilityLabel,
    ...props
}: NumberWithSymbolFormProps) {
    const styles = useThemeStyles();
    const isInLandscapeMode = useIsInLandscapeMode();
    const isFocused = useIsFocused();
    const wasFocused = usePrevious(isFocused);
    const wasNegative = usePrevious(isNegative);
    const innerEditingRef = useRef<NumericEditingRef | null>(null);
    const textInputRef = useRef<BaseTextInputRef | null>(null);

    // Set only while the flip button toggles the root's sign, so the resulting change is reported as a flip rather than an edit
    const isFlippingSignRef = useRef(false);

    // The caller owns the sign through `isNegative` while the root keeps it inside its canonical value; the adapter bridges the two
    const isSignOwnedByParent = !displayAsTextInput && !allowNegativeInput && (allowFlippingAmount || isNegative);
    const allowNegativeInRoot = allowNegativeInput || allowFlippingAmount || isNegative;
    const canonicalValue = isNegative && !value.startsWith('-') ? `-${value}` : value;

    // A hidden symbol is composed as no symbol at all
    const visibleSymbol = hideSymbol ? '' : symbol;

    const setTextInputRef = (newRef: BaseTextInputRef | null) => {
        textInputRef.current = newRef;
        if (typeof ref === 'function') {
            ref(newRef);
        } else if (ref && 'current' in ref) {
            // eslint-disable-next-line no-param-reassign
            ref.current = newRef;
        }
    };

    // Clears text selection if user visits symbol (currency) selector and comes back
    useEffect(() => {
        if (!isFocused || wasFocused) {
            return;
        }
        innerEditingRef.current?.clearSelection();
    }, [isFocused, wasFocused]);

    // The root only adopts external values when they are cleared, so a sign the parent changes without an edit is pushed in here.
    // Only a change counts: on mount the root already starts from the signed value, which may carry the sign before `isNegative` does.
    // Edits and flips made through the root already hold the new sign, so they are skipped and keep their caret.
    useEffect(() => {
        if (displayAsTextInput || allowNegativeInput || wasNegative === isNegative) {
            return;
        }

        const rootValue = innerEditingRef.current?.getNumber() ?? '';
        if (rootValue.startsWith('-') === isNegative) {
            return;
        }

        const magnitude = stripSign(rootValue);
        innerEditingRef.current?.updateNumber(isNegative ? `-${magnitude}` : magnitude);
    }, [isNegative, wasNegative, displayAsTextInput, allowNegativeInput]);

    useImperativeHandle(numberFormRef, () => ({
        clearSelection: () => innerEditingRef.current?.clearSelection(),
        getNumber: () => {
            const val = innerEditingRef.current?.getNumber() ?? '';
            return isSignOwnedByParent ? stripSign(val) : val;
        },
        updateNumber: (newNumber: string) => {
            if (!isSignOwnedByParent) {
                innerEditingRef.current?.updateNumber(newNumber);
                return;
            }

            // A signed number makes the amount negative. Only a positive amount flips the parent-owned sign, the same way a typed
            // minus does, so re-applying the negative amount the form already shows (e.g. the formatted draft amount) is not a flip.
            if (allowFlippingAmount && newNumber.startsWith('-')) {
                const isRootNegative = (innerEditingRef.current?.getNumber() ?? '').startsWith('-');
                if (!isRootNegative) {
                    toggleNegative?.();
                }
                innerEditingRef.current?.updateNumber(newNumber);
                return;
            }

            // Callers pass the magnitude, so the root keeps the sign the parent currently holds
            innerEditingRef.current?.updateNumber(isNegative ? `-${newNumber}` : newNumber);
        },
    }));

    /**
     * Reports root changes to the parent: the magnitude through `onInputChange` and a changed sign through `toggleNegative`
     * or `clearNegative`. The sign is compared against `isNegative`, so edits that keep the sign never toggle it again.
     */
    const handleInputChange = (newValue: string) => {
        if (!isSignOwnedByParent) {
            onInputChange?.(newValue);
            return;
        }

        const isNewValueNegative = newValue.startsWith('-');

        // A flip only changes the sign, so the magnitude the parent holds is still current
        if (isFlippingSignRef.current) {
            toggleNegative?.();
            return;
        }

        // Report the magnitude first so a parent that reports its signed amount on toggle has the final word
        onInputChange?.(stripSign(newValue));

        if (isNewValueNegative === isNegative) {
            return;
        }

        if (isNewValueNegative || !clearNegative) {
            toggleNegative?.();
            return;
        }

        clearNegative();
    };

    const flipSign = (toggleRootSign: () => void) => {
        // A root that owns the sign reports the flipped value through `onInputChange` like any other edit
        if (!isSignOwnedByParent) {
            toggleRootSign();
            return;
        }

        // The root notifies synchronously, so the flag covers exactly the change this toggle produces
        isFlippingSignRef.current = true;
        toggleRootSign();
        isFlippingSignRef.current = false;
    };

    // Only the text-input path needs this: the other paths clear a negative sign through the root and `handleInputChange`
    const handleKeyPress = (event: NumericEditingKeyPressEvent) => {
        const key = event.nativeEvent.key.toLowerCase();
        if (!value && key === 'backspace' && isNegative) {
            clearNegative?.();
        }
    };

    if (displayAsTextInput) {
        const currencyOrUnitButtonText = currencyButtonLabel ?? currency;
        const onTrailingDropdownPress = onCurrencyButtonPress ?? onSymbolButtonPress;

        const isFlipButtonVisible = shouldShowFlipButton && allowNegativeInput && canUseTouchScreen;
        const isCurrencyButtonVisible = shouldShowCurrencyButton && !!currencyOrUnitButtonText;

        const textInputRightHandSideComponent =
            isFlipButtonVisible || isCurrencyButtonVisible || !!leadingRightHandSideComponent ? (
                <View style={[styles.flexRow, styles.gap2, styles.alignItemsCenter]}>
                    {leadingRightHandSideComponent}
                    {isFlipButtonVisible && <NumericField.FlipButton isDisabled={disabled} />}
                    {isCurrencyButtonVisible && (
                        <NumericField.CurrencyButton
                            currency={currencyOrUnitButtonText}
                            onPress={onTrailingDropdownPress}
                            accessibilityLabel={currencyButtonAccessibilityLabel}
                            isDisabled={disabled}
                        />
                    )}
                </View>
            ) : undefined;

        // The text-input path takes the sign from the typed value, so it ignores the parent-owned `isNegative`
        return (
            <NumericField
                value={value}
                onInputChange={onInputChange}
                allowNegative={allowNegativeInput}
                decimals={decimals}
                maxLength={maxLength}
                errorText={errorText}
                ref={innerEditingRef}
            >
                <NumericField.TextInput
                    ref={setTextInputRef}
                    label={label}
                    accessibilityLabel={label}
                    prefixCharacter={visibleSymbol || prefixCharacter}
                    keyboardType={props.keyboardType}
                    style={style}
                    autoFocus={props.autoFocus}
                    autoGrowExtraSpace={props.autoGrowExtraSpace}
                    autoGrowMarginSide={props.autoGrowMarginSide}
                    disabled={disabled}
                    shouldUseDefaultLineHeightForPrefix={shouldUseDefaultLineHeightForPrefix}
                    onSubmitEditing={onSubmitEditing}
                    onFocus={props.onFocus}
                    onBlur={props.onBlur}
                    onKeyPress={handleKeyPress}
                    testID={props.testID}
                    rightHandSideComponent={textInputRightHandSideComponent}
                />
            </NumericField>
        );
    }

    if (!shouldWrapInputInContainer) {
        // None of the inline callers make the symbol pressable, so `isSymbolPressable` and `onSymbolButtonPress` do not apply here.
        const isSuffix = symbolPosition === CONST.TEXT_INPUT_SYMBOL_POSITION.SUFFIX;

        // Cells that show the symbol or a parent-owned sign (TotalCell) keep the legacy layout: the minus sign and the symbol are
        // separate texts beside the auto-growing input. As the input's own prefix or suffix they would get no room, because the
        // auto-grow measurement leaves out the prefix/suffix padding and the value is clipped to zero width.
        const hasStandaloneSymbolOrSign = !!visibleSymbol || isSignOwnedByParent;

        const symbolNode = visibleSymbol ? (
            <View style={[styles.flexRow, styles.alignItemsCenter, styles.gap1]}>
                <NumericInput.Symbol textStyle={symbolTextStyle}>{visibleSymbol}</NumericInput.Symbol>
            </View>
        ) : null;

        const field = hasStandaloneSymbolOrSign ? (
            <NumericInput
                value={canonicalValue}
                onInputChange={handleInputChange}
                allowNegative={allowNegativeInRoot}
                decimals={decimals}
                maxLength={maxLength}
                errorText={errorText}
                shouldUseDynamicFontSize={shouldUseDynamicFontSize}
                symbol={visibleSymbol}
                ref={innerEditingRef}
            >
                <NumericInput.MinusSign style={negativeSymbolStyle} />
                {!isSuffix && symbolNode}
                <NumericInput.TextInput
                    ref={setTextInputRef}
                    testID={props.testID}
                    accessibilityLabel={props.accessibilityLabel}
                    style={style}
                    containerStyle={containerStyle}
                    touchableInputWrapperStyle={props.touchableInputWrapperStyle}
                    prefixCharacter={prefixCharacter}
                    prefixStyle={props.prefixStyle}
                    prefixContainerStyle={props.prefixContainerStyle}
                    shouldApplyPaddingToContainer={shouldApplyPaddingToContainer}
                    shouldUseDefaultLineHeightForPrefix={shouldUseDefaultLineHeightForPrefix}
                    contentWidth={props.contentWidth}
                    autoGrow={autoGrow}
                    autoGrowExtraSpace={props.autoGrowExtraSpace}
                    autoGrowMarginSide={props.autoGrowMarginSide}
                    disableKeyboard={disableKeyboard}
                    disabled={disabled}
                    hideFocusedState={hideFocusedState}
                    keyboardType={props.keyboardType}
                    autoFocus={props.autoFocus}
                    onPress={props.onPress}
                    onSubmitEditing={onSubmitEditing}
                    submitBehavior={props.submitBehavior}
                    onFocus={props.onFocus}
                    onBlur={props.onBlur}
                />
                {isSuffix && symbolNode}
            </NumericInput>
        ) : (
            // Split rows hide the symbol and keep the sign inside the value, which the input displays as typed
            <NumericField
                value={canonicalValue}
                onInputChange={handleInputChange}
                allowNegative={allowNegativeInRoot}
                decimals={decimals}
                maxLength={maxLength}
                errorText={errorText}
                ref={innerEditingRef}
            >
                <NumericField.TextInput
                    ref={setTextInputRef}
                    testID={props.testID}
                    label={label}
                    accessibilityLabel={props.accessibilityLabel ?? label}
                    style={style}
                    containerStyle={containerStyle}
                    touchableInputWrapperStyle={props.touchableInputWrapperStyle}
                    prefixCharacter={prefixCharacter}
                    prefixStyle={props.prefixStyle}
                    prefixContainerStyle={props.prefixContainerStyle}
                    shouldApplyPaddingToContainer={shouldApplyPaddingToContainer}
                    shouldUseDefaultLineHeightForPrefix={shouldUseDefaultLineHeightForPrefix}
                    contentWidth={props.contentWidth}
                    autoGrow={autoGrow}
                    autoGrowExtraSpace={props.autoGrowExtraSpace}
                    autoGrowMarginSide={props.autoGrowMarginSide}
                    disableKeyboard={disableKeyboard}
                    disabled={disabled}
                    hideFocusedState={hideFocusedState}
                    keyboardType={props.keyboardType}
                    autoFocus={props.autoFocus}
                    onSubmitEditing={onSubmitEditing}
                    submitBehavior={props.submitBehavior}
                    onFocus={props.onFocus}
                    onBlur={props.onBlur}
                />
            </NumericField>
        );

        if (!scrollViewStyle && !shouldRefocusOnScrollViewClick) {
            // The sign, symbol and input are siblings, so without the caller's scroll view row they need a row of their own
            return hasStandaloneSymbolOrSign ? <View style={[styles.flexRow, styles.alignItemsCenter]}>{field}</View> : field;
        }

        return (
            <ScrollView
                contentContainerStyle={[styles.flexGrow1, scrollViewStyle]}
                style={[styles.flexGrow0, shouldRefocusOnScrollViewClick && styles.cursorAuto]}
                onMouseDown={(e) => {
                    if (!shouldRefocusOnScrollViewClick) {
                        return;
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    textInputRef.current?.focus();
                }}
            >
                {field}
            </ScrollView>
        );
    }

    // Full-screen forms: the legacy precedence lets onSymbolButtonPress win over onCurrencyButtonPress, and a symbol
    // that is not pressable is composed as no currency button at all
    const currencyButtonText = isSymbolPressable ? (currencyButtonLabel ?? currency) : undefined;

    // The flip button only toggles a parent-owned sign when the parent can be told about it
    const isFlipButtonVisible = allowFlippingAmount && canUseTouchScreen && (!!toggleNegative || !isSignOwnedByParent);
    const flipButton = isFlipButtonVisible ? (
        <RootFlipButton
            onFlip={flipSign}
            style={styles.minWidth18}
        />
    ) : null;

    return (
        <NumericInput
            value={canonicalValue}
            onInputChange={handleInputChange}
            allowNegative={allowNegativeInRoot}
            decimals={decimals}
            maxLength={maxLength}
            errorText={errorText}
            shouldUseDynamicFontSize={shouldUseDynamicFontSize}
            symbol={visibleSymbol}
            ref={innerEditingRef}
        >
            <NumericInput.ResponsivePreset
                symbol={visibleSymbol}
                symbolPosition={symbolPosition}
                symbolTextStyle={symbolTextStyle}
                currency={currencyButtonText}
                onCurrencyButtonPress={onSymbolButtonPress ?? onCurrencyButtonPress}
                currencyButtonAccessibilityLabel={currencyButtonAccessibilityLabel}
                flipButton={flipButton}
                pad={shouldShowBigNumberPad ? <NumericInput.BigNumberPad /> : null}
                footer={footer}
                amountContainerTestID={isInLandscapeMode ? undefined : 'numberView'}
                scrollViewStyle={scrollViewStyle}
                shouldRefocusOnScrollViewClick={shouldRefocusOnScrollViewClick}
                negativeSymbolStyle={negativeSymbolStyle}
                textInputStyle={style}
                inputTestID={props.testID}
                ref={ref}
                accessibilityLabel={props.accessibilityLabel}
                autoFocus={props.autoFocus}
                autoGrow={autoGrow}
                autoGrowExtraSpace={props.autoGrowExtraSpace}
                autoGrowMarginSide={props.autoGrowMarginSide}
                containerStyle={containerStyle}
                contentWidth={props.contentWidth}
                disabled={disabled}
                disableKeyboard={disableKeyboard}
                hideFocusedState={hideFocusedState}
                keyboardType={props.keyboardType}
                onBlur={props.onBlur}
                onFocus={props.onFocus}
                onPress={props.onPress}
                onSubmitEditing={onSubmitEditing}
                prefixCharacter={prefixCharacter}
                prefixContainerStyle={props.prefixContainerStyle}
                prefixStyle={props.prefixStyle}
                shouldApplyPaddingToContainer={shouldApplyPaddingToContainer}
                shouldUseDefaultLineHeightForPrefix={shouldUseDefaultLineHeightForPrefix}
                submitBehavior={props.submitBehavior}
                touchableInputWrapperStyle={props.touchableInputWrapperStyle}
            />
        </NumericInput>
    );
}

export default NumberWithSymbolForm;
export type {NumberWithSymbolFormProps, NumberWithSymbolFormRef};
