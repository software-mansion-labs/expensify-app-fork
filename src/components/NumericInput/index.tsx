import {NumericCurrencyButton} from '@components/NumericButtons';

import NumericInputActions from './layout/NumericInputActions';
import NumericInputFooter from './layout/NumericInputFooter';
import NumericInputResponsiveLayout from './layout/NumericInputResponsiveLayout';
import NumericInputComponent from './NumericInput';
import NumericInputResponsivePreset, {NumericResponsivePreset} from './presets/NumericInputResponsivePreset';
import NumericBigNumberPad from './primitives/NumericBigNumberPad';
import NumericError from './primitives/NumericError';
import NumericFlipButton from './primitives/NumericFlipButton';
import NumericInputContainer from './primitives/NumericInputContainer';
import NumericMinusSign from './primitives/NumericMinusSign';
import NumericSymbol from './primitives/NumericSymbol';
import NumericTextInput from './primitives/NumericTextInput';

/**
 * NumericInput is a composable numeric editing experience for symbol and number-pad interactions.
 *
 * The root owns the canonical signed value, the selection, and validation through the same root-instantiated
 * edit controller as NumericField. The composed input displays only the magnitude. The sign and symbol are
 * primitives placed by the composition, in the order and layout it wants.
 *
 * Full-screen numeric forms (typically filling the RHP, with or without the number pad) can use
 * `NumericInput.ResponsivePreset` inside the root, or the standalone `NumericResponsivePreset`. Inline text
 * fields should use NumericField instead.
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
 *   />
 * </NumericInput>
 * ```
 */

const NumericInput = Object.assign(NumericInputComponent, {
    /** Layout container grouping action controls (`NumericInput.CurrencyButton`, `NumericInput.FlipButton`). */
    Actions: NumericInputActions,

    /** Renders the touch number pad wired to NumericInput actions and selection. */
    BigNumberPad: NumericBigNumberPad,

    /** Renders the centered, full-size amount layout with legacy empty-area refocus behavior. */
    Container: NumericInputContainer,

    /** Opens the currency selector. */
    CurrencyButton: NumericCurrencyButton,

    /** Renders the root error, positioned by the composition. */
    Error: NumericError,

    /** Toggles the sign of the value. Renders only when the root allows negative values. */
    FlipButton: NumericFlipButton,

    /** Layout container for the footer/CTA at the bottom of the screen. */
    Footer: NumericInputFooter,

    /** Renders the minus sign of a negative value, which the input itself does not display. */
    MinusSign: NumericMinusSign,

    /** Responsive layout template handling 4 layout variants (portrait/landscape x touch/non-touch) with explicit slots. */
    ResponsiveLayout: NumericInputResponsiveLayout,

    /** Responsive preset composing the standard full-screen layout, with `pad`, `flipButton`, and `footer` slots. */
    ResponsivePreset: NumericInputResponsivePreset,

    /** Renders its children as the symbol (currency or unit) displayed beside the number. */
    Symbol: NumericSymbol,

    /** Renders the number itself, displaying and editing the magnitude of the canonical value. */
    TextInput: NumericTextInput,
});

export default NumericInput;
export {NumericResponsivePreset};
export {useNumericInputActions} from './context';
export {default as useNumericDynamicFontSize} from './hooks/useNumericDynamicFontSize';
