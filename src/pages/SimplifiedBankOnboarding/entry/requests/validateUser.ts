import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/contract/REQUEST_NAMES';
import type {PlannedRequest} from '@pages/SimplifiedBankOnboarding/core';
import {clearRequestState, getRequestKey, planRequestWithInput} from '@pages/SimplifiedBankOnboarding/core';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

/** Validates the mock user with the code the user typed. The server message is not shown, only a wrong code message. */
function getValidateUserRequest(): PlannedRequest<string> {
    return planRequestWithInput({name: REQUEST_NAMES.VALIDATE_USER}, (validateCode: string) => ({
        type: 'write',
        command: WRITE_COMMANDS.VALIDATE_USER,
        params: {validateCode},
        errorKey: 'validateCodeForm.error.incorrectSecurityCode',
    }));
}

/** Drops the error of the last attempt, such as when the user types again or leaves the page */
function clearValidateUserErrors(): Promise<void> {
    return clearRequestState(getRequestKey(REQUEST_NAMES.VALIDATE_USER));
}

export {clearValidateUserErrors, getValidateUserRequest};
