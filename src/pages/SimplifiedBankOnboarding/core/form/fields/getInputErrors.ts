/**
 * The errors of one input, shared by every field that owns a single input. The form page and the completeness check of
 * the plan both read them, so the flow never resumes on a page that the user cannot submit.
 */
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import {isRequiredFulfilled} from '@libs/ValidationUtils';

import type {InputID, OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {OnboardingFormErrors} from '@pages/SimplifiedBankOnboarding/contract/formID';

import type {InputRule} from './types';

function getInputError(inputID: InputID, rule: InputRule, values: OnboardingDraft, translate: LocalizedTranslate): string | undefined {
    const value = values[inputID];
    if (!isRequiredFulfilled(value)) {
        return rule.isOptional ? undefined : (rule.requiredErrorText ?? translate('common.error.fieldRequired'));
    }
    return typeof value === 'string' ? rule.validate?.(value, values) : undefined;
}

function getInputErrors(inputID: InputID, rule: InputRule, values: OnboardingDraft, translate: LocalizedTranslate): OnboardingFormErrors {
    const errors: OnboardingFormErrors = {};
    const error = getInputError(inputID, rule, values, translate);
    if (error) {
        errors[inputID] = error;
    }
    return errors;
}

export default getInputErrors;
