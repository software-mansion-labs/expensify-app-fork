import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import clearRequestState from '@pages/SimplifiedBankOnboarding/requests/clearRequestState';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import runRequest from '@pages/SimplifiedBankOnboarding/requests/runRequest';
import type {RequestOutcome} from '@pages/SimplifiedBankOnboarding/requests/types';

/** Validates the mock user with the code the user typed. The server message is not shown, only a wrong code message. */
function validateUser(validateCode: string): Promise<RequestOutcome> {
    return runRequest({
        name: REQUEST_NAMES.VALIDATE_USER,
        type: 'write',
        command: WRITE_COMMANDS.VALIDATE_USER,
        params: {validateCode},
        errorKey: 'validateCodeForm.error.incorrectSecurityCode',
    });
}

/** Drops the error of the last attempt, such as when the user types again or leaves the page */
function clearValidateUserErrors(): Promise<void> {
    return clearRequestState(REQUEST_NAMES.VALIDATE_USER);
}

export default validateUser;
export {clearValidateUserErrors};
