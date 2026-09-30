import useIsInLandscapeMode from '@hooks/useIsInLandscapeMode';
import usePrevious from '@hooks/usePrevious';
import useThemeStyles from '@hooks/useThemeStyles';

import {canUseTouchScreen as canUseTouchScreenUtil} from '@libs/DeviceCapabilities';
import mergeRefs from '@libs/mergeRefs';

import CONST from '@src/CONST';

import type {ForwardedRef} from 'react';
import type {KeyboardTypeOptions, StyleProp, TextStyle, ViewStyle} from 'react-native';

import {useIsFocused} from '@react-navigation/native';
import React, {useEffect, useRef} from 'react';
import {View} from 'react-native';

import type {NumericEditingKeyPressEvent, NumericEditingRef} from './NumericEditingController';
import type {BaseTextInputRef} from './TextInput/BaseTextInput/types';
import type {TextInputWithSymbolProps} from './TextInputWithSymbol/types';

import NumericField from './NumericField';
import NumericInput from './NumericInput';
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

type NumberWithSymbolFormRef = NumericEditingRef;

const canUseTouchScreen = canUseTouchScreenUtil();

/**
 * Legacy path -> presentation. Every branch of the adapter is one row here, or one of the named legacy edge cases below.
 *
 * | Path           | Legacy props                                                          | Presentation                                            | Callers                              |
 * | -------------- | --------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------ |
 * | `field`        | `displayAsTextInput`                                                  | `NumericField`, sign typed in the text                  | AmountForm, TaxFields, AmountField   |
 * | `inlineAmount` | `shouldWrapInputInContainer={false}` with a symbol or a bridged sign  | `NumericInput` + `AmountRow` in a row                   | TotalCell                            |
 * | `inlineField`  | `shouldWrapInputInContainer={false}` with neither                     | `NumericField`, sign typed in the text                  | split rows (OptionRow, SplitAmount)  |
 * | `fullScreen`   | anything else                                                         | `NumericInput` + `ResponsivePreset` + `AmountRow`       | amount, distance, hours, tax pages   |
 *
 * Legacy edge cases:
 * - Sign bridge: without `allowNegativeInput`, the caller owns the sign through `isNegative` / `toggleNegative` /
 *   `clearNegative`. It maps onto the root's controlled sign, and every reported change is a flip of the caller's sign.
 * - `hideSymbol` composes no symbol at all, and a symbol that is not pressable composes no currency button.
 * - `onSymbolButtonPress` wins over `onCurrencyButtonPress`.
 * - The flip button only shows when the caller can be told about a flip of a sign it owns.
 * - On the `field` path, a backspace in an empty negative field clears the caller's sign.
 * - The portrait amount container keeps the `numberView` test id.
 */
type LegacyPath = 'field' | 'inlineAmount' | 'inlineField' | 'fullScreen';

type LegacyPathFlags = {
    displayAsTextInput: boolean;
    shouldWrapInputInContainer: boolean;
    hasSymbol: boolean;
    isSignShownBesideAmount: boolean;
};

function getLegacyPath({displayAsTextInput, shouldWrapInputInContainer, hasSymbol, isSignShownBesideAmount}: LegacyPathFlags): LegacyPath {
    if (displayAsTextInput) {
        return 'field';
    }

    if (shouldWrapInputInContainer) {
        return 'fullScreen';
    }

    // Cells that show the symbol or a bridged sign render them beside the amount, which only the amount presentation does
    return hasSymbol || isSignShownBesideAmount ? 'inlineAmount' : 'inlineField';
}

/**
 * Adapter mapping the legacy NumberWithSymbolForm interface onto the composable numeric components, through the path
 * table above. The legacy display flags are translated into composition here, so the numeric components never receive them.
 *
 * Transitional: callers should migrate to NumericField or NumericInput directly, owning a signed value instead of
 * `isNegative`/`toggleNegative`. This adapter, its sign bridge, and the legacy `numberView` test id are removed once no
 * caller is left.
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
    const innerEditingRef = useRef<NumericEditingRef | null>(null);
    const textInputRef = useRef<BaseTextInputRef | null>(null);

    const editingRef = mergeRefs(innerEditingRef, numberFormRef);
    const inputRef = mergeRefs(textInputRef, ref);

    const visibleSymbol = hideSymbol ? '' : symbol;

    // The caller keeps the sign apart from the number, and the root takes it as a controlled sign
    const isSignBridged = !displayAsTextInput && !allowNegativeInput;
    const isSignShownBesideAmount = isSignBridged && (allowFlippingAmount || isNegative);
    const allowNegative = allowNegativeInput || allowFlippingAmount || isNegative;

    // Paths without the bridge take the sign inside the value
    const signedValue = isNegative && !value.startsWith('-') ? `-${value}` : value;

    // Every reported change flips the sign the caller holds, so a toggle is exact; `clearNegative` is only a fallback
    const handleSignChange = (nextIsNegative: boolean) => {
        if (toggleNegative) {
            toggleNegative();
            return;
        }

        if (!nextIsNegative) {
            clearNegative?.();
        }
    };

    const rootValueProps = isSignBridged ? {value, isNegative, onSignChange: handleSignChange} : {value: signedValue};

    // Clears text selection if user visits symbol (currency) selector and comes back
    useEffect(() => {
        if (!isFocused || wasFocused) {
            return;
        }
        innerEditingRef.current?.clearSelection();
    }, [isFocused, wasFocused]);

    const path = getLegacyPath({displayAsTextInput, shouldWrapInputInContainer, hasSymbol: !!visibleSymbol, isSignShownBesideAmount});

    const textInputProps = {
        ref: inputRef,
        testID: props.testID,
        style,
        containerStyle,
        touchableInputWrapperStyle: props.touchableInputWrapperStyle,
        prefixCharacter,
        prefixStyle: props.prefixStyle,
        prefixContainerStyle: props.prefixContainerStyle,
        shouldApplyPaddingToContainer,
        shouldUseDefaultLineHeightForPrefix,
        contentWidth: props.contentWidth,
        autoGrow,
        autoGrowExtraSpace: props.autoGrowExtraSpace,
        autoGrowMarginSide: props.autoGrowMarginSide,
        disableKeyboard,
        disabled,
        hideFocusedState,
        keyboardType: props.keyboardType,
        autoFocus: props.autoFocus,
        onSubmitEditing,
        submitBehavior: props.submitBehavior,
        onFocus: props.onFocus,
        onBlur: props.onBlur,
    };

    if (path === 'field') {
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

        // Legacy edge case: the sign is typed in the text, so an empty negative field has no character left to delete it
        const handleKeyPress = (event: NumericEditingKeyPressEvent) => {
            if (value || !isNegative || event.nativeEvent.key.toLowerCase() !== 'backspace') {
                return;
            }

            clearNegative?.();
        };

        return (
            <NumericField
                value={value}
                onInputChange={onInputChange}
                allowNegative={allowNegativeInput}
                decimals={decimals}
                maxLength={maxLength}
                errorText={errorText}
                ref={editingRef}
            >
                <NumericField.TextInput
                    ref={inputRef}
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

    if (path === 'fullScreen') {
        const currencyButtonText = isSymbolPressable ? (currencyButtonLabel ?? currency) : undefined;
        const isFlipButtonVisible = allowFlippingAmount && (!!toggleNegative || !isSignShownBesideAmount);

        return (
            <NumericInput
                {...rootValueProps}
                onInputChange={onInputChange}
                allowNegative={allowNegative}
                decimals={decimals}
                maxLength={maxLength}
                errorText={errorText}
                ref={editingRef}
            >
                <NumericInput.ResponsivePreset
                    currency={currencyButtonText}
                    onCurrencyButtonPress={onSymbolButtonPress ?? onCurrencyButtonPress}
                    currencyButtonAccessibilityLabel={currencyButtonAccessibilityLabel}
                    flipButton={
                        isFlipButtonVisible ? (
                            <NumericInput.FlipButton
                                isDisabled={false}
                                style={styles.minWidth18}
                            />
                        ) : null
                    }
                    pad={shouldShowBigNumberPad ? <NumericInput.BigNumberPad /> : null}
                    footer={footer}
                    amountTestID={isInLandscapeMode ? undefined : 'numberView'}
                    scrollViewStyle={scrollViewStyle}
                    shouldRefocusOnScrollViewClick={shouldRefocusOnScrollViewClick}
                >
                    <NumericInput.AmountRow
                        {...textInputProps}
                        symbol={visibleSymbol}
                        symbolPosition={symbolPosition}
                        symbolStyle={symbolTextStyle}
                        signStyle={negativeSymbolStyle}
                        shouldUseDynamicFontSize={shouldUseDynamicFontSize}
                        accessibilityLabel={props.accessibilityLabel}
                        onPress={props.onPress}
                    />
                </NumericInput.ResponsivePreset>
            </NumericInput>
        );
    }

    // None of the inline callers make the symbol pressable, so `isSymbolPressable` and `onSymbolButtonPress` do not apply here
    const field =
        path === 'inlineAmount' ? (
            <NumericInput
                {...rootValueProps}
                onInputChange={onInputChange}
                allowNegative={allowNegative}
                decimals={decimals}
                maxLength={maxLength}
                errorText={errorText}
                ref={editingRef}
            >
                <NumericInput.AmountRow
                    {...textInputProps}
                    symbol={visibleSymbol}
                    symbolPosition={symbolPosition}
                    symbolStyle={symbolTextStyle}
                    signStyle={negativeSymbolStyle}
                    shouldUseDynamicFontSize={shouldUseDynamicFontSize}
                    accessibilityLabel={props.accessibilityLabel}
                    onPress={props.onPress}
                />
            </NumericInput>
        ) : (
            <NumericField
                value={signedValue}
                onInputChange={onInputChange}
                allowNegative={allowNegative}
                decimals={decimals}
                maxLength={maxLength}
                errorText={errorText}
                ref={editingRef}
            >
                <NumericField.TextInput
                    {...textInputProps}
                    label={label}
                    accessibilityLabel={props.accessibilityLabel ?? label}
                />
            </NumericField>
        );

    if (!scrollViewStyle && !shouldRefocusOnScrollViewClick) {
        // The amount row renders siblings, so without the caller's scroll view it needs a row of its own
        return path === 'inlineAmount' ? <View style={[styles.flexRow, styles.alignItemsCenter]}>{field}</View> : field;
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

export default NumberWithSymbolForm;
export type {NumberWithSymbolFormProps, NumberWithSymbolFormRef};
