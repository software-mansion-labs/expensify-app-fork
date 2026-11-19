import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {FieldConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/types/form';

import type {OnboardingFormErrors} from './types';

import getFieldError from './getFieldError';

/** The validator of a form page: the errors of every input field, keyed by input ID */
function validateFields(fields: FieldConfig[], values: OnboardingDraft, translate: LocalizedTranslate): OnboardingFormErrors {
    const errors: OnboardingFormErrors = {};
    for (const field of fields) {
        if (field.type === 'readOnly') {
            continue;
        }
        const error = getFieldError(field, values, translate);
        if (error) {
            errors[field.id] = error;
        }
    }
    return errors;
}

export default validateFields;
