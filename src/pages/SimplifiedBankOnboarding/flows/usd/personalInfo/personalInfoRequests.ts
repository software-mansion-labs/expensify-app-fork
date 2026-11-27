/**
 * The writes of the USD personal info step. Both send all four answers: the silent save after each input page with
 * `confirm: false`, and the confirmation with `confirm: true`, which asks the server to move on.
 */
import type {OnboardingRequest, RequestSpec, FlowData} from '@pages/SimplifiedBankOnboarding/core';
import getUSDWriteOptions from '@pages/SimplifiedBankOnboarding/flows/usd/usdWriteOptions';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import getPersonalInfoAnswers from './getPersonalInfoAnswers';

function buildPersonalInfo(data: FlowData, confirm: boolean): RequestSpec {
    return {
        type: 'write',
        command: WRITE_COMMANDS.UPDATE_PERSONAL_INFORMATION,
        params: {...data.bankAccount, ...getPersonalInfoAnswers(data), confirm},
        ...getUSDWriteOptions({shouldKeepOnfidoToken: true}),
    };
}

/** Its failure is shown nowhere, an accepted small loss (BC-08), because the confirmation sends the same values again */
const personalInfoProgressRequest: OnboardingRequest = {
    name: 'usd.personalInfo.saveProgress',
    build: (saved) => ({...buildPersonalInfo(saved, false), shouldShowErrorOutsideFlow: false}),
};

const personalInfoRequest: OnboardingRequest = {
    name: 'usd.personalInfo.confirm',
    build: (saved) => buildPersonalInfo(saved, true),
};

export {personalInfoProgressRequest, personalInfoRequest};
