import useNumericDynamicFontSize from '@components/NumericInput/hooks/useNumericDynamicFontSize';
import type {NumericAmountRowProps} from '@components/NumericInput/types';

import CONST from '@src/CONST';

import React from 'react';

import NumericMinusSign from './NumericMinusSign';
import NumericSymbol from './NumericSymbol';
import NumericTextInput from './NumericTextInput';

/**
 * Renders the amount as the minus sign, the symbol and the number, in reading order, sharing one font size.
 * The symbol is a sibling of the auto-growing input rather than its prefix or suffix: the auto-grow measurement
 * leaves out the prefix/suffix padding, so the value would be clipped. The parent provides the row.
 * Props not consumed here are forwarded to `NumericInput.TextInput`.
 */
function NumericAmountRow({
    symbol,
    symbolPosition = CONST.TEXT_INPUT_SYMBOL_POSITION.PREFIX,
    shouldUseDynamicFontSize = false,
    symbolStyle,
    signStyle,
    style,
    ...textInputProps
}: NumericAmountRowProps) {
    const dynamicFontSizeStyle = useNumericDynamicFontSize(symbol);
    const fontSizeStyle = shouldUseDynamicFontSize ? dynamicFontSizeStyle : undefined;
    const isSuffix = symbolPosition === CONST.TEXT_INPUT_SYMBOL_POSITION.SUFFIX;

    const symbolNode = symbol ? <NumericSymbol textStyle={[symbolStyle, fontSizeStyle]}>{symbol}</NumericSymbol> : null;

    return (
        <>
            <NumericMinusSign style={[signStyle, fontSizeStyle]} />
            {!isSuffix && symbolNode}
            <NumericTextInput
                {...textInputProps}
                style={[style, fontSizeStyle]}
            />
            {isSuffix && symbolNode}
        </>
    );
}

export default NumericAmountRow;
