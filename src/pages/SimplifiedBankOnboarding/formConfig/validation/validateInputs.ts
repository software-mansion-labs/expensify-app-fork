import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {PageInputs} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/types/form';
import type {OnboardingFormErrors} from '@pages/SimplifiedBankOnboarding/types/formID';

import getInputError from './getInputError';
import getInputIDs from './getInputIDs';

/** The validator of a form page: the errors of its inputs, keyed by input ID */
function validateInputs(inputs: PageInputs, values: OnboardingDraft, translate: LocalizedTranslate): OnboardingFormErrors {
    const errors: OnboardingFormErrors = {};
    for (const inputID of getInputIDs(inputs)) {
        const error = getInputError(inputs, inputID, values, translate);
        if (error) {
            errors[inputID] = error;
        }
    }
    return errors;
}

export default validateInputs;
