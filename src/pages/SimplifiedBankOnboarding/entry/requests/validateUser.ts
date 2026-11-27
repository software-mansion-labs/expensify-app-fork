/* eslint-disable rulesdir/prefer-actions-set-data -- This file is the action layer of an isolated research module, so it lives outside src/libs/actions */
/** The request of the verify page. The user key carries its loading state and its error, which the page shows. */
import {getMicroSecondOnyxErrorWithTranslationKey} from '@libs/ErrorUtils';

import {runRequest} from '@pages/SimplifiedBankOnboarding/core';
import type {RequestOutcome} from '@pages/SimplifiedBankOnboarding/core';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

/** Sends the code. The server marks the user validated when the code is the one it expects. */
function validateUser(validateCode: string): Promise<RequestOutcome> {
    return runRequest({
        name: 'entry.verifyAccount.validateUser',
        type: 'write',
        command: WRITE_COMMANDS.VALIDATE_USER,
        params: {validateCode},
        onyxData: {
            optimisticData: [
                {
                    onyxMethod: Onyx.METHOD.MERGE,
                    key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_USER,
                    value: {isLoading: true, errors: null},
                },
            ],
            successData: [
                {
                    onyxMethod: Onyx.METHOD.MERGE,
                    key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_USER,
                    value: {isLoading: false},
                },
            ],
            failureData: [
                {
                    onyxMethod: Onyx.METHOD.MERGE,
                    key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_USER,
                    value: {
                        isLoading: false,
                        errors: getMicroSecondOnyxErrorWithTranslationKey('validateCodeForm.error.incorrectSecurityCode'),
                    },
                },
            ],
        },
    });
}

function clearValidateUserErrors(): Promise<void> {
    return Onyx.merge(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_USER, {errors: null});
}

export {clearValidateUserErrors, validateUser};
