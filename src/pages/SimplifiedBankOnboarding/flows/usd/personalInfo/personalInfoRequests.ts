/**
 * The writes of the USD personal info step. Both send all four answers: the silent save after each input page with
 * `confirm: false`, and the confirmation with `confirm: true`, which asks the server to move on.
 */
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import type {OnboardingRequest, RequestSpec, FlowData} from '@pages/SimplifiedBankOnboarding/core';
import {getUSDAnswers} from '@pages/SimplifiedBankOnboarding/flows/usd/usdAnswers';
import getUSDWriteOptions from '@pages/SimplifiedBankOnboarding/flows/usd/usdWriteOptions';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

function buildPersonalInfo({bankAccount, account, draft}: FlowData, confirm: boolean): RequestSpec {
    const answers = getUSDAnswers(draft, account);
    return {
        type: 'write',
        command: WRITE_COMMANDS.UPDATE_PERSONAL_INFORMATION,
        params: {...bankAccount, firstName: answers.firstName, lastName: answers.lastName, dob: answers.dob, ssnLast4: answers.ssnLast4, confirm},
        ...getUSDWriteOptions(SBO_CONST.USD.STEP.REQUESTOR),
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
