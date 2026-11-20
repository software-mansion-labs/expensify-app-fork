import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {ACHData, USDStep} from '@pages/SimplifiedBankOnboarding/types/onyx';

const SERVER_STEP_ORDER: USDStep[] = [
    SBO_CONST.USD.STEP.COUNTRY,
    SBO_CONST.USD.STEP.BANK_ACCOUNT,
    SBO_CONST.USD.STEP.REQUESTOR,
    SBO_CONST.USD.STEP.COMPANY,
    SBO_CONST.USD.STEP.BENEFICIAL_OWNERS,
    SBO_CONST.USD.STEP.ACH_CONTRACT,
    SBO_CONST.USD.STEP.KYB_DOCS,
    SBO_CONST.USD.STEP.VALIDATION,
    SBO_CONST.USD.STEP.ENABLE,
];

/** The server moves `currentStep` forward after each saved step, so a later current step means the step was saved */
function hasPassedServerStep(achData: ACHData | undefined, step: USDStep): boolean {
    const currentStepIndex = SERVER_STEP_ORDER.indexOf(achData?.currentStep ?? SBO_CONST.USD.STEP.COUNTRY);
    return currentStepIndex > SERVER_STEP_ORDER.indexOf(step);
}

export default hasPassedServerStep;
