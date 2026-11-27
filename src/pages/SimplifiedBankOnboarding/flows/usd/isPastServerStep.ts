/**
 * The progress of a USD setup. The server stores one current step, so the user finished a step of the flow when the
 * server step is a later one.
 */
import type {ACHData, USDStep} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';

import type {OnyxEntry} from 'react-native-onyx';

const {STEP} = SBO_CONST.USD;

const SERVER_STEP_ORDER: USDStep[] = [STEP.COUNTRY, STEP.BANK_ACCOUNT, STEP.REQUESTOR, STEP.COMPANY, STEP.BENEFICIAL_OWNERS, STEP.ACH_CONTRACT, STEP.KYB_DOCS, STEP.VALIDATION];

/**
 * False while the server stored no step, and for the step of a connected account, which is no step of the setup. So
 * such an account opens the first step of the flow.
 */
function isPastServerStep(achData: OnyxEntry<ACHData>, step: USDStep): boolean {
    const serverStep = achData?.currentStep;
    const serverStepIndex = serverStep ? SERVER_STEP_ORDER.indexOf(serverStep) : -1;
    return serverStepIndex > SERVER_STEP_ORDER.indexOf(step);
}

export default isPastServerStep;
