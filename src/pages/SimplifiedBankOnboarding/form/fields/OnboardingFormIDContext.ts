import type {OnboardingFormID} from '@pages/SimplifiedBankOnboarding/types/formID';

import ONYXKEYS from '@src/ONYXKEYS';

import {createContext} from 'react';

/** The form of the open page. The fields come from the plan, which does not know the form, so the page provides it. */
const OnboardingFormIDContext = createContext<OnboardingFormID>(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM);

export default OnboardingFormIDContext;
