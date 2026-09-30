import {NumericCurrencyButton} from '@components/NumericButtons';

import NumericInputResponsiveLayout from './layout/NumericInputResponsiveLayout';
import NumericInputComponent from './NumericInput';
import NumericInputResponsivePreset from './presets/NumericInputResponsivePreset';
import NumericAmountRow from './primitives/NumericAmountRow';
import NumericBigNumberPad from './primitives/NumericBigNumberPad';
import NumericError from './primitives/NumericError';
import NumericFlipButton from './primitives/NumericFlipButton';
import NumericMinusSign from './primitives/NumericMinusSign';
import NumericSymbol from './primitives/NumericSymbol';
import NumericTextInput from './primitives/NumericTextInput';

/**
 * NumericInput is the large-amount presentation of a number: the sign and the symbol render as siblings of a big
 * auto-growing amount, with or without the number pad.
 *
 * Choosing a presentation: use NumericField when the number is edited as a standard form field, with the sign typed in
 * the text. Use NumericInput when the sign and the symbol render beside the large amount. The two are separate modules on
 * purpose, sharing only the editing controller, the imperative ref and `NumericButtons`, so neither tree branches on
 * which presentation it is. A screen picks one and never switches at runtime.
 *
 * The root owns the canonical signed value, the selection, and validation through the same root-instantiated edit
 * controller as NumericField, and renders no view of its own. The composed input displays only the magnitude. A caller
 * that keeps the sign apart from the number passes `isNegative` and `onSignChange`, and exchanges magnitudes with the root.
 * `NumericInput.AmountRow` composes the sign, the symbol and the input; the primitives stay available for unusual screens.
 * `NumericInput.ResponsiveLayout` owns the device policy of a full-screen form, and `NumericInput.ResponsivePreset`
 * fills it with the standard buttons and pad.
 *
 * @example
 * ```tsx
 * import NumericInput from '@components/NumericInput';
 *
 * <NumericInput
 *   value={amount}
 *   onInputChange={setAmount}
 *   decimals={2}
 *   allowNegative
 * >
 *   <NumericInput.ResponsivePreset
 *     currency="USD"
 *     onCurrencyButtonPress={handleCurrency}
 *     footer={<Button text="Next" onPress={handleSubmit} />}
 *   >
 *     <NumericInput.AmountRow symbol="$" shouldUseDynamicFontSize />
 *   </NumericInput.ResponsivePreset>
 * </NumericInput>
 * ```
 */

const NumericInput = Object.assign(NumericInputComponent, {
    /** Renders the minus sign, the symbol and the number in one row with a shared font size. */
    AmountRow: NumericAmountRow,

    /** Renders the number pad wired to NumericInput actions and selection. The layout decides where, and whether, it shows. */
    BigNumberPad: NumericBigNumberPad,

    /** Opens the currency selector. */
    CurrencyButton: NumericCurrencyButton,

    /** Renders the root error, positioned by the composition. */
    Error: NumericError,

    /** Toggles the sign of the value. Renders only when the root allows negative values. */
    FlipButton: NumericFlipButton,

    /** Renders the minus sign of a negative value, which the input itself does not display. */
    MinusSign: NumericMinusSign,

    /** Responsive layout of a full-screen form, owning touch, orientation, placement, scrolling and refocus, with element slots. */
    ResponsiveLayout: NumericInputResponsiveLayout,

    /** Scaffold filling `ResponsiveLayout` with the standard flip button, pad and currency button around the given amount row. */
    ResponsivePreset: NumericInputResponsivePreset,

    /** Renders its children as the symbol (currency or unit) displayed beside the number. */
    Symbol: NumericSymbol,

    /** Renders the number itself, displaying and editing the magnitude of the canonical value. */
    TextInput: NumericTextInput,
});

export default NumericInput;
export {useNumericInputActions} from './context';
export {default as useNumericDynamicFontSize} from './hooks/useNumericDynamicFontSize';
