/**
 * The three checkboxes of the USD complete verification step, resolved like every other input: the draft first, then
 * the answers that the server saved.
 */
import type {DraftFields} from '@pages/SimplifiedBankOnboarding/requests/buildTrackedRequestData';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import type {ACHData} from '@pages/SimplifiedBankOnboarding/types/onyx';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/values/resolveValue';
import {resolveBooleanValue} from '@pages/SimplifiedBankOnboarding/values/resolveValue';

type USDAgreementValues = {
    isAuthorizedToUseBankAccount: boolean;
    certifyTrueInformation: boolean;
    acceptTermsAndConditions: boolean;
};

const FIELDS_TO_CLEAR: DraftFields = [INPUT_IDS.IS_AUTHORIZED_TO_USE_BANK_ACCOUNT, INPUT_IDS.CERTIFY_TRUE_INFORMATION, INPUT_IDS.ACCEPT_TERMS_AND_CONDITIONS];

function resolveAgreements(draft: OnboardingDraft, achData: ACHData | undefined): USDAgreementValues {
    return {
        isAuthorizedToUseBankAccount: resolveBooleanValue(INPUT_IDS.IS_AUTHORIZED_TO_USE_BANK_ACCOUNT, draft, achData) ?? false,
        certifyTrueInformation: resolveBooleanValue(INPUT_IDS.CERTIFY_TRUE_INFORMATION, draft, achData) ?? false,
        acceptTermsAndConditions: resolveBooleanValue(INPUT_IDS.ACCEPT_TERMS_AND_CONDITIONS, draft, achData) ?? false,
    };
}

/** The checkboxes leave an unchecked value undefined, and the request needs a boolean */
function toParams(values: Partial<USDAgreementValues>): USDAgreementValues {
    return {
        isAuthorizedToUseBankAccount: !!values.isAuthorizedToUseBankAccount,
        certifyTrueInformation: !!values.certifyTrueInformation,
        acceptTermsAndConditions: !!values.acceptTermsAndConditions,
    };
}

export {FIELDS_TO_CLEAR, resolveAgreements, toParams};
export type {USDAgreementValues};
