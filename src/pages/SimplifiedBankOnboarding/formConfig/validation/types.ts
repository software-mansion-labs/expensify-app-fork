import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';

import type ONYXKEYS from '@src/ONYXKEYS';

/** Every page of the flow renders the one onboarding form, so its values are the draft of the whole flow */
type OnboardingFormID = typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM;

type OnboardingFormValues = FormOnyxValues<OnboardingFormID>;

type OnboardingFormErrors = FormInputErrors<OnboardingFormID>;

export type {OnboardingFormErrors, OnboardingFormID, OnboardingFormValues};
