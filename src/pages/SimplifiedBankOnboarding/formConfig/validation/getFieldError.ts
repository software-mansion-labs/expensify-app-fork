/**
 * The validation of one field, shared by the form renderer and the completeness check of the plan. Both must agree,
 * or the resume position would point at a page that the user cannot submit.
 */
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import {isRequiredFulfilled} from '@libs/ValidationUtils';

import type {InputFieldConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/types/form';

import getDateError from './getDateError';

function getRequiredError(field: InputFieldConfig, translate: LocalizedTranslate): string {
    return field.requiredErrorText ?? translate('common.error.fieldRequired');
}

/** Returns the error of one field: the required check first, then the rule of its type and its own validator */
function getFieldError(field: InputFieldConfig, values: OnboardingDraft, translate: LocalizedTranslate): string | undefined {
    switch (field.type) {
        case 'text': {
            const value = values[field.id] ?? '';
            if (!isRequiredFulfilled(value)) {
                return field.isRequired ? getRequiredError(field, translate) : undefined;
            }
            return field.validate?.(value, values);
        }
        case 'date': {
            const value = values[field.id] ?? '';
            if (!isRequiredFulfilled(value)) {
                return field.isRequired ? getRequiredError(field, translate) : undefined;
            }
            return getDateError(field, value, translate);
        }
        case 'picklist':
        case 'checkbox':
        case 'file':
            return field.isRequired && !isRequiredFulfilled(values[field.id]) ? getRequiredError(field, translate) : undefined;
        default:
            return undefined;
    }
}

export default getFieldError;
