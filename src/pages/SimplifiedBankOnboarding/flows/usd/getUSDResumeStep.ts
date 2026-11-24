/**
 * The USD step that opens when the URL names none: the step that the server stored, or the first step. The server step
 * of the identity check is the requestor step, so the identity check is reached through personal info.
 */
import type {USDStepID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import type {ACHData, USDStep} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';

import type {OnyxEntry} from 'react-native-onyx';

const {STEP, PAGE_NAMES} = SBO_CONST.USD;

const STEP_OF_SERVER_STEP: Partial<Record<USDStep, USDStepID>> = {
    [STEP.COUNTRY]: PAGE_NAMES.COUNTRY,
    [STEP.BANK_ACCOUNT]: PAGE_NAMES.BANK_ACCOUNT,
    [STEP.REQUESTOR]: PAGE_NAMES.REQUESTOR,
    [STEP.COMPANY]: PAGE_NAMES.COMPANY,
    [STEP.BENEFICIAL_OWNERS]: PAGE_NAMES.BENEFICIAL_OWNERS,
    [STEP.ACH_CONTRACT]: PAGE_NAMES.ACH_CONTRACT,
    [STEP.KYB_DOCS]: PAGE_NAMES.KYB_DOCS,
    [STEP.VALIDATION]: PAGE_NAMES.VALIDATION,
};

function getUSDResumeStep(achData: OnyxEntry<ACHData>): USDStepID {
    const serverStep = achData?.currentStep;
    return (serverStep && STEP_OF_SERVER_STEP[serverStep]) ?? PAGE_NAMES.COUNTRY;
}

export default getUSDResumeStep;
