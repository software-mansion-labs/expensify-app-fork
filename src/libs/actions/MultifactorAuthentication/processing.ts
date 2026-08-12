import type {MultifactorAuthenticationScenarioConfigFor} from '@components/MultifactorAuthentication/config';
import type {
    MultifactorAuthenticationScenario,
    MultifactorAuthenticationScenarioParameters,
    MultifactorAuthenticationScenarioResponse,
} from '@components/MultifactorAuthentication/config/types';

import {isHttpSuccess} from '@libs/MultifactorAuthentication/shared/helpers';
import {createLocalMFAError, createMFAErrorFromApiResponse} from '@libs/MultifactorAuthentication/shared/MFAResult';
import type {MFAResult} from '@libs/MultifactorAuthentication/shared/MFAResult';
import type {RegistrationKeyInfo} from '@libs/MultifactorAuthentication/shared/types';
import VALUES from '@libs/MultifactorAuthentication/VALUES';

import {registerAuthenticationKey} from './index';

type RegistrationParams = {
    keyInfo: RegistrationKeyInfo;
};

async function processRegistration(params: RegistrationParams): Promise<MFAResult> {
    const {httpStatusCode, reason, message} = await registerAuthenticationKey({
        keyInfo: params.keyInfo,
    });

    if (isHttpSuccess(httpStatusCode)) {
        return {success: true};
    }

    return {success: false, error: createMFAErrorFromApiResponse(httpStatusCode, reason, message)};
}

/**
 * Executes the scenario-specific action with the signed challenge and additional parameters.
 *
 * @param action - The scenario's action function from the scenario config
 * @param params - Action parameters including signedChallenge and authenticationMethod
 */
type ScenarioAction = MultifactorAuthenticationScenarioConfigFor<MultifactorAuthenticationScenario>['action'];
type ScenarioActionParams = MultifactorAuthenticationScenarioParameters[MultifactorAuthenticationScenario];

async function processScenarioAction(action: ScenarioAction, params: ScenarioActionParams): Promise<MFAResult<MultifactorAuthenticationScenarioResponse>> {
    if (!params.signedChallenge) {
        return {
            success: false,
            error: createLocalMFAError(VALUES.REASON.LOCAL_ERRORS.SIGNATURE_MISSING, 'Signed challenge is missing from scenario action params'),
        };
    }

    // INIT keeps the action and payload paired; the machine context intentionally erases that generic.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const runAction = action as (actionParams: ScenarioActionParams) => Promise<MultifactorAuthenticationScenarioResponse>;
    const {httpStatusCode, reason, message, body} = await runAction(params);

    if (isHttpSuccess(httpStatusCode)) {
        return {
            success: true,
            httpStatusCode,
            reason,
            message,
            body,
        };
    }

    return {success: false, error: createMFAErrorFromApiResponse(httpStatusCode, reason, message)};
}

export {processRegistration, processScenarioAction};
