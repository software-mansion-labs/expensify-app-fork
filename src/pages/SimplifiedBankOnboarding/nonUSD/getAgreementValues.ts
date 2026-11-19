/**
 * Collects the answers of the agreements step: the draft first, then the server data, like `getSubStepValues` does for
 * text inputs. The agreements step and the docusign step both send these answers.
 */
import type {OnboardingForm} from '@pages/SimplifiedBankOnboarding/types/form';
import type {OnboardingAccount} from '@pages/SimplifiedBankOnboarding/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

type AgreementValues = {
    authorizedToBindClientToAgreement: boolean;
    agreeToTermsAndConditions: boolean;
    consentToPrivacyNotice: boolean;
};

function getAgreementValues(draft: OnyxEntry<OnboardingForm>, account: OnyxEntry<OnboardingAccount>): AgreementValues {
    const corpay = account?.achData?.corpay;
    return {
        authorizedToBindClientToAgreement: draft?.authorizedToBindClientToAgreement ?? corpay?.authorizedToBindClientToAgreement ?? false,
        agreeToTermsAndConditions: draft?.agreeToTermsAndConditions ?? corpay?.agreeToTermsAndConditions ?? false,
        consentToPrivacyNotice: draft?.consentToPrivacyNotice ?? corpay?.consentToPrivacyNotice ?? false,
    };
}

export default getAgreementValues;
export type {AgreementValues};
