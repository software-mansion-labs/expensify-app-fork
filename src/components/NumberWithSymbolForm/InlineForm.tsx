import type {NumericEditingRef} from '@components/NumericEditingController/types';
import NumericField from '@components/NumericField';
import NumericInput from '@components/NumericInput';
import type {NumericTextInputProps} from '@components/NumericInput/types';
import ScrollView from '@components/ScrollView';
import type {BaseTextInputRef} from '@components/TextInput/BaseTextInput/types';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';

import type {RefObject} from 'react';
import type {StyleProp, TextStyle, ViewStyle} from 'react-native';

import React from 'react';
import {View} from 'react-native';

import type {AdapterRootProps, AdapterTextInputProps, SymbolPosition} from './types';
import type {ParentOwnedSign} from './useParentOwnedSign';

import ParentOwnedMinusSign from './ParentOwnedMinusSign';
import ParentOwnedSignActions from './ParentOwnedSignActions';
import {getSizedAdornment} from './useParentOwnedSign';

type InlineFormProps = {
    /** Props of the NumericInput or NumericField root, already carrying the canonical signed value */
    root: AdapterRootProps;

    /** Ref of the root */
    editingRef: RefObject<NumericEditingRef | null>;

    /** Props forwarded to the text input */
    textInputProps: AdapterTextInputProps;

    /** Text input instance, focused when the caller's scroll view row is pressed */
    textInputRef: RefObject<BaseTextInputRef | null>;

    /** Called when the text input is pressed. Only the standalone sign/symbol layout supports it. */
    onPress?: NumericTextInputProps['onPress'];

    /** Label of the split row text input */
    label?: string;

    /** Symbol displayed beside the number, or an empty string for none */
    symbol: string;

    /** Position of the symbol relative to the input */
    symbolPosition: SymbolPosition;

    /** Style applied to the symbol text */
    symbolTextStyle?: StyleProp<TextStyle>;

    /** Called when the symbol is pressed. The symbol is pressable only when it is set. */
    onSymbolButtonPress?: () => void;

    /** Style applied to the minus sign */
    negativeSymbolStyle?: StyleProp<TextStyle>;

    /** Whether to scale the font size down when the amount is long */
    shouldUseDynamicFontSize: boolean;

    /** Who owns the sign and which sign gestures the user may make */
    sign: ParentOwnedSign;

    /** Style of the caller's scroll view row */
    scrollViewStyle?: StyleProp<ViewStyle>;

    /** Whether pressing the caller's scroll view row refocuses the input */
    shouldRefocusOnScrollViewClick: boolean;
};

/**
 * `shouldWrapInputInContainer={false}` path of the legacy number form, used by table cells (TotalCell) and split rows.
 * As in the legacy form, this is the only path whose symbol itself is pressable (`isSymbolPressable` with `onSymbolButtonPress`).
 */
function InlineForm({
    root,
    editingRef,
    textInputProps,
    textInputRef,
    onPress,
    label,
    symbol,
    symbolPosition,
    symbolTextStyle,
    onSymbolButtonPress,
    negativeSymbolStyle,
    shouldUseDynamicFontSize,
    sign,
    scrollViewStyle,
    shouldRefocusOnScrollViewClick,
}: InlineFormProps) {
    const styles = useThemeStyles();
    const {numberFormat} = useLocalize();
    const isSuffix = symbolPosition === CONST.TEXT_INPUT_SYMBOL_POSITION.SUFFIX;

    // Cells that show the symbol or a parent-owned sign (TotalCell) keep the legacy layout: the minus sign and the symbol are
    // separate texts beside the auto-growing input. As the input's own prefix or suffix they would get no room, because the
    // auto-grow measurement leaves out the prefix/suffix padding and the value is clipped to zero width.
    const hasStandaloneSymbolOrSign = !!symbol || sign.canShowParentSign;

    let symbolNode = null;
    if (symbol && onSymbolButtonPress) {
        symbolNode = (
            <NumericInput.SymbolButton
                onPress={onSymbolButtonPress}
                textStyle={symbolTextStyle}
            >
                {symbol}
            </NumericInput.SymbolButton>
        );
    } else if (symbol) {
        symbolNode = (
            <View style={[styles.flexRow, styles.alignItemsCenter, styles.gap1]}>
                <NumericInput.Symbol textStyle={symbolTextStyle}>{symbol}</NumericInput.Symbol>
            </View>
        );
    }

    const field = hasStandaloneSymbolOrSign ? (
        <NumericInput
            value={root.value}
            onInputChange={root.onInputChange}
            allowNegative={root.allowNegative}
            decimals={root.decimals}
            maxLength={root.maxLength}
            errorText={root.errorText}
            shouldUseDynamicFontSize={shouldUseDynamicFontSize}
            symbol={getSizedAdornment(symbol, sign)}
            ref={editingRef}
        >
            {sign.isSignOwnedByParent ? (
                <ParentOwnedMinusSign
                    isNegative={sign.isParentNegative}
                    style={negativeSymbolStyle}
                />
            ) : (
                <NumericInput.MinusSign style={negativeSymbolStyle} />
            )}
            {!isSuffix && symbolNode}
            <ParentOwnedSignActions setNumber={sign.setNumber}>
                <NumericInput.TextInput
                    {...textInputProps}
                    onPress={onPress}
                    onKeyPress={sign.handleKeyPress}
                />
            </ParentOwnedSignActions>
            {isSuffix && symbolNode}
        </NumericInput>
    ) : (
        // Split rows hide the symbol and keep the sign inside the value, which the input displays as typed
        <NumericField
            value={root.value}
            onInputChange={root.onInputChange}
            allowNegative={root.allowNegative}
            decimals={root.decimals}
            maxLength={root.maxLength}
            errorText={root.errorText}
            ref={editingRef}
        >
            <NumericField.TextInput
                {...textInputProps}
                label={label}
                accessibilityLabel={textInputProps.accessibilityLabel ?? label}
                // The legacy amount input kept a small gap after the number (NumericInput.TextInput adds the same padding)
                style={[styles.pr1, textInputProps.style]}
                // The legacy amount input showed a zero placeholder, used the full input height, and hid the iPad keyboard suggestions
                placeholder={numberFormat(0)}
                shouldUseFullInputHeight
                autoCorrect={false}
                spellCheck={false}
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

export default InlineForm;
