/**
 * Picks the values that the server saved for a USD step, so the entry page can copy them into the draft after a request.
 * It mirrors `getFieldsForStep` and `getBankAccountFields` of the real flow, including the fact that the server
 * only returns the masked account number, so the copy in the draft loses the digits that the user typed.
 */
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import type {OnboardingForm} from '@pages/SimplifiedBankOnboarding/types/form';
import type {ACHData, USDStep} from '@pages/SimplifiedBankOnboarding/types/onyx';

import type {TextInputID} from './getSubStepValues';

import {getTextValue} from './getSubStepValues';

const {STEP} = SBO_CONST.USD;

function getFieldsForStep(step: USDStep): TextInputID[] {
    switch (step) {
        case STEP.BANK_ACCOUNT:
            return [INPUT_IDS.ROUTING_NUMBER, INPUT_IDS.ACCOUNT_NUMBER, INPUT_IDS.BANK_NAME, INPUT_IDS.PLAID_ACCOUNT_ID];
        case STEP.REQUESTOR:
            return [INPUT_IDS.FIRST_NAME, INPUT_IDS.LAST_NAME, INPUT_IDS.DOB, INPUT_IDS.SSN_LAST_4];
        case STEP.COMPANY:
            return [INPUT_IDS.COMPANY_NAME, INPUT_IDS.COMPANY_TAX_ID, INPUT_IDS.INCORPORATION_TYPE];
        default:
            return [];
    }
}

function getDraftValuesForStep(step: USDStep, achData: ACHData | undefined): Partial<OnboardingForm> {
    const draftValues: Partial<Record<TextInputID, string>> = {};
    for (const field of getFieldsForStep(step)) {
        const value = getTextValue(achData, field);
        if (value !== undefined) {
            draftValues[field] = value;
        }
    }
    return draftValues;
}

export default getDraftValuesForStep;
