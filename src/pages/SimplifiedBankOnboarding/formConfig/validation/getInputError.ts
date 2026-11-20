/**
 * The validation of one input, shared by the form page and the completeness check of the plan. Both must agree, or the
 * resume position would point at a page that the user cannot submit.
 */
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import {isRequiredFulfilled} from '@libs/ValidationUtils';

import type {PageInputs} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import type {InputID, OnboardingDraft} from '@pages/SimplifiedBankOnboarding/types/form';

/** Returns the error of one input of a page: the required check first, then the validator of a text input */
function getInputError(inputs: PageInputs, inputID: InputID, values: OnboardingDraft, translate: LocalizedTranslate): string | undefined {
    const rule = inputs[inputID];
    if (!rule) {
        return undefined;
    }
    const value = values[inputID];
    if (!isRequiredFulfilled(value)) {
        return rule.isOptional ? undefined : (rule.requiredErrorText ?? translate('common.error.fieldRequired'));
    }
    if (typeof value !== 'string' || !('validate' in rule)) {
        return undefined;
    }
    return rule.validate?.(value, values);
}

export default getInputError;
