import {NumericCurrencyButton} from '@components/NumericButtons';

import NumericFieldComponent from './NumericField';
import NumericFlipButton from './primitives/NumericFlipButton';
import NumericTextInput from './primitives/NumericTextInput';

/**
 * NumericField – a composable field for editing numeric values.
 *
 * Choosing a presentation: use NumericField when the number is edited as a standard form field, with the sign typed in
 * the text. Use NumericInput when the sign and the symbol render beside the large amount. The two are separate modules on
 * purpose, sharing only the editing controller, the imperative ref and `NumericButtons`, so neither tree branches on
 * which presentation it is. A screen picks one and never switches at runtime.
 *
 * The root component owns the canonical value, the selection, validation, and
 * the input callbacks through a root-instantiated edit controller. Compose the
 * input presentation as a child:
 *
 * @example
 * ```tsx
 * import NumericField from '@components/NumericField';
 *
 * <NumericField
 *   value={amount}
 *   onInputChange={setAmount}
 *   decimals={2}
 *   allowNegative
 *   errorText={error}
 * >
 *   <NumericField.TextInput
 *     prefixCharacter="$"
 *     label="Amount"
 *   />
 * </NumericField>
 * ```
 *
 * The `useNumericFieldState` and `useNumericFieldActions` hooks are also exported
 * for custom composed primitives.
 */

const NumericField = Object.assign(NumericFieldComponent, {
    /** Opens the currency selector. */
    CurrencyButton: NumericCurrencyButton,

    /** Toggles the sign of the value. Renders only when the root allows negative values. */
    FlipButton: NumericFlipButton,

    /** Renders a numeric input using the standard text input component. */
    TextInput: NumericTextInput,
});

export default NumericField;
export {useNumericFieldActions, useNumericFieldState} from './context';
export type {NumericFieldRef, NumericTextInputProps} from './types';
