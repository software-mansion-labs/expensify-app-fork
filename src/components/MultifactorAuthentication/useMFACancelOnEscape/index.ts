import {useMultifactorAuthenticationInternal} from '@components/MultifactorAuthentication/Context/MultifactorAuthenticationInternalApiContext';

import suppressNextEscapeKeyup from './suppressNextEscapeKeyup';

/**
 * Returns the MFA modal's Escape handler: it requests a cancel, which opens the cancel-confirmation
 * modal during a flow step and closes the modal on an outcome screen.
 */
function useMFACancelOnEscape(): () => void {
    const {requestCancel} = useMultifactorAuthenticationInternal();

    return () => {
        suppressNextEscapeKeyup();
        requestCancel();
    };
}

export default useMFACancelOnEscape;
