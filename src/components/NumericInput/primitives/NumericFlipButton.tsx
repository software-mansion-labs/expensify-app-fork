import {NumericFlipButton as NumericFlipButtonComponent} from '@components/NumericButtons';
import {useNumericInputActions, useNumericInputState} from '@components/NumericInput/context';
import type {NumericInputFlipButtonProps} from '@components/NumericInput/types';

/** Toggles the sign of the canonical value. Rendered only when the root allows negative values; the composing screen or layout decides whether a device shows it. */
function NumericFlipButton(props: NumericInputFlipButtonProps) {
    const {allowNegative} = useNumericInputState();
    const {toggleSign} = useNumericInputActions();

    if (!allowNegative) {
        return null;
    }

    return (
        <NumericFlipButtonComponent
            {...props}
            onPress={toggleSign}
        />
    );
}

export default NumericFlipButton;
