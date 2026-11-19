import type {FormInputErrors} from '@components/Form/types';

import type ONYXKEYS from '@src/ONYXKEYS';

/**
 * The forms that a form page renders: the onboarding form, whose values are the draft of the whole flow, and the form of
 * an invited director, whose inputs are the signer inputs of the onboarding form under the same IDs
 */
type OnboardingFormID = typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM | typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM;

type OnboardingFormErrors = FormInputErrors<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM>;

export type {OnboardingFormErrors, OnboardingFormID};
