import FullScreenAmountLayoutBody from './FullScreenAmountLayoutBody';
import FullScreenAmountLayoutFooter from './FullScreenAmountLayoutFooter';
import FullScreenAmountLayoutMain from './FullScreenAmountLayoutMain';
import FullScreenAmountLayoutPad from './FullScreenAmountLayoutPad';
import FullScreenAmountLayoutRoot from './FullScreenAmountLayoutRoot';

/**
 * Composable template for full-screen amount pages. It places its parts only and owns no numeric state, so it must be
 * rendered inside a `<NumericInput>` root. NumericInput itself never depends on it and works without any layout.
 *
 * @example
 * ```tsx
 * <NumericInput value={value} onInputChange={setValue}>
 *     <FullScreenAmountLayout>
 *         <FullScreenAmountLayout.Body>
 *             <FullScreenAmountLayout.Main>
 *                 <NumericInput.Container>
 *                     <NumericInput.TextInput />
 *                 </NumericInput.Container>
 *             </FullScreenAmountLayout.Main>
 *             <FullScreenAmountLayout.Pad>
 *                 <NumericInput.BigNumberPad />
 *             </FullScreenAmountLayout.Pad>
 *         </FullScreenAmountLayout.Body>
 *         <FullScreenAmountLayout.Footer>
 *             <Button onPress={save}>Save</Button>
 *         </FullScreenAmountLayout.Footer>
 *     </FullScreenAmountLayout>
 * </NumericInput>
 * ```
 */
const FullScreenAmountLayout = Object.assign(FullScreenAmountLayoutRoot, {
    /** Region holding `Main` and `Pad`: the scrollable row in two columns, the space above the footer otherwise. */
    Body: FullScreenAmountLayoutBody,

    /** Column holding the amount, its actions, and error. */
    Main: FullScreenAmountLayoutMain,

    /** Container for the touch number pad. Renders nothing on non-touch devices. */
    Pad: FullScreenAmountLayoutPad,

    /** Full-width container for the submit CTA below the body. */
    Footer: FullScreenAmountLayoutFooter,
});

export default FullScreenAmountLayout;
