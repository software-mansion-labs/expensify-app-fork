/**
 * The answers of the NonUSD agreements step, resolved like every other input: the draft first, then the server data.
 * The agreements step and the docusign step both send them, together with the files that only the draft holds.
 */
import type {DraftFields} from '@pages/SimplifiedBankOnboarding/requests/buildTrackedRequestData';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import type {ACHData} from '@pages/SimplifiedBankOnboarding/types/onyx';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/values/resolveValue';
import {resolveBooleanValue} from '@pages/SimplifiedBankOnboarding/values/resolveValue';

type AgreementValues = {
    authorizedToBindClientToAgreement: boolean;
    agreeToTermsAndConditions: boolean;
    consentToPrivacyNotice: boolean;
};

const FIELDS_TO_CLEAR: DraftFields = [
    INPUT_IDS.AUTHORIZED_TO_BIND_CLIENT_TO_AGREEMENT,
    INPUT_IDS.AGREE_TO_TERMS_AND_CONDITIONS,
    INPUT_IDS.CONSENT_TO_PRIVACY_NOTICE,
    INPUT_IDS.BANK_STATEMENT,
    INPUT_IDS.ACH_AUTHORIZATION_FORM,
];

function resolveAgreements(draft: OnboardingDraft, achData: ACHData | undefined): AgreementValues {
    return {
        authorizedToBindClientToAgreement: resolveBooleanValue(INPUT_IDS.AUTHORIZED_TO_BIND_CLIENT_TO_AGREEMENT, draft, achData) ?? false,
        agreeToTermsAndConditions: resolveBooleanValue(INPUT_IDS.AGREE_TO_TERMS_AND_CONDITIONS, draft, achData) ?? false,
        consentToPrivacyNotice: resolveBooleanValue(INPUT_IDS.CONSENT_TO_PRIVACY_NOTICE, draft, achData) ?? false,
    };
}

export {FIELDS_TO_CLEAR, resolveAgreements};
export type {AgreementValues};
