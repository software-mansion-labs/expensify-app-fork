import DotIndicatorMessage from '@components/DotIndicatorMessage';

import useThemeStyles from '@hooks/useThemeStyles';

import React from 'react';

type RequestErrorMessageProps = {
    message: string | undefined;
};

/** The one look of a request error: DotIndicatorMessage with formError, nothing when there is no message */
function RequestErrorMessage({message}: RequestErrorMessageProps) {
    const styles = useThemeStyles();
    if (!message) {
        return null;
    }
    return (
        <DotIndicatorMessage
            textStyles={[styles.formError]}
            type="error"
            messages={{error: message}}
        />
    );
}

export default RequestErrorMessage;
export type {RequestErrorMessageProps};
