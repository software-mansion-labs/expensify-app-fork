import FormHelpMessage from '@components/FormHelpMessage';
import {useNumericInputState} from '@components/NumericInput/context';
import type {NumericErrorProps} from '@components/NumericInput/types';

import useThemeStyles from '@hooks/useThemeStyles';

import React from 'react';

/** Renders the root error, positioned by the composition or preset. */
function NumericError({style}: NumericErrorProps) {
    const styles = useThemeStyles();
    const {errorText} = useNumericInputState();

    if (!errorText) {
        return null;
    }

    return (
        <FormHelpMessage
            isError
            message={errorText}
            style={[styles.ph5, styles.w100, style]}
        />
    );
}

export default NumericError;
