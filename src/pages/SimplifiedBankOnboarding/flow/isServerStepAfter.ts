/**
 * The adapter between the step that the server stores for a USD account and the flow definition. The server keeps its
 * own order of steps, and a USD step counts as complete once the server moved past it.
 */
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {ACHData, USDStep} from '@pages/SimplifiedBankOnboarding/types/onyx';

const {STEP} = SBO_CONST.USD;

const SERVER_STEP_ORDER: readonly USDStep[] = [
    STEP.COUNTRY,
    STEP.BANK_ACCOUNT,
    STEP.REQUESTOR,
    STEP.COMPANY,
    STEP.BENEFICIAL_OWNERS,
    STEP.ACH_CONTRACT,
    STEP.KYB_DOCS,
    STEP.VALIDATION,
    STEP.ENABLE,
];

/** Returns true when the step that the server stores comes after the given one */
function isServerStepAfter(server: ACHData | undefined, step: USDStep): boolean {
    const serverStep = server?.currentStep;
    if (!serverStep) {
        return false;
    }
    return SERVER_STEP_ORDER.indexOf(serverStep) > SERVER_STEP_ORDER.indexOf(step);
}

export default isServerStepAfter;
