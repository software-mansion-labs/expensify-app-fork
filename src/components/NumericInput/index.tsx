import {NumericCurrencyButton} from '@components/NumericButtons';

import NumericInputActions from './layout/NumericInputActions';
import NumericInputComponent from './NumericInput';
import NumericBigNumberPad from './primitives/NumericBigNumberPad';
import NumericError from './primitives/NumericError';
import NumericFlipButton from './primitives/NumericFlipButton';
import NumericInputContainer from './primitives/NumericInputContainer';
import NumericMinusSign from './primitives/NumericMinusSign';
import NumericSymbol from './primitives/NumericSymbol';
import NumericSymbolButton from './primitives/NumericSymbolButton';
import NumericTextInput from './primitives/NumericTextInput';

/**
 * NumericInput is a composable numeric editing experience for symbol and number-pad interactions.
 *
 * The root owns the canonical signed value, the selection, and validation through the same root-instantiated
 * edit controller as NumericField. The composed input displays only the magnitude. The sign and symbol are
 * primitives placed by the composition, in the order and layout it wants.
 *
 * NumericInput owns no screen layout. Full-screen numeric forms (typically filling the RHP, with or without the number pad)
 * place these primitives with `FullScreenAmountLayout`. Inline text fields should use NumericField instead.
 *
 * @example
 * ```tsx
 * import FullScreenAmountLayout from '@components/FullScreenAmountLayout';
 * import NumericInput from '@components/NumericInput';
 *
 * <NumericInput
 *   value={amount}
 *   onInputChange={setAmount}
 *   decimals={2}
 *   allowNegative
 * >
 *   <FullScreenAmountLayout>
 *     <FullScreenAmountLayout.Body>
 *       <FullScreenAmountLayout.Main>
 *         <NumericInput.Container>
 *           <NumericInput.MinusSign />
 *           <NumericInput.Symbol>$</NumericInput.Symbol>
 *           <NumericInput.TextInput />
 *         </NumericInput.Container>
 *         <NumericInput.Actions>
 *           <NumericInput.FlipButton />
 *         </NumericInput.Actions>
 *         <NumericInput.Error />
 *       </FullScreenAmountLayout.Main>
 *       <FullScreenAmountLayout.Pad>
 *         <NumericInput.BigNumberPad />
 *       </FullScreenAmountLayout.Pad>
 *     </FullScreenAmountLayout.Body>
 *     <FullScreenAmountLayout.Footer>
 *       <Button text="Next" onPress={handleSubmit} />
 *     </FullScreenAmountLayout.Footer>
 *   </FullScreenAmountLayout>
 * </NumericInput>
 * ```
 */

const NumericInput = Object.assign(NumericInputComponent, {
    /** Row grouping action controls (`NumericInput.CurrencyButton`, `NumericInput.FlipButton`). */
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

    /** Renders the minus sign of a negative value, which the input itself does not display. */
    MinusSign: NumericMinusSign,

    /** Renders its children as the symbol (currency or unit) displayed beside the number. */
    Symbol: NumericSymbol,

    /** Renders a pressable symbol control with the shared NumericInput symbol styling. */
    SymbolButton: NumericSymbolButton,

    /** Renders the number itself, displaying and editing the magnitude of the canonical value. */
    TextInput: NumericTextInput,
});

export default NumericInput;
export {useNumericInputActions} from './context';
