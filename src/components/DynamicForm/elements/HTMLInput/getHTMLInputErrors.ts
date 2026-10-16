import type {DynamicFormValues} from '@components/DynamicForm/types';
import {getFormatErrors, isAnswered} from '@components/DynamicForm/utils/getDynamicFieldErrors';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import {addErrorMessage} from '@libs/ErrorUtils';
import {isValidDate} from '@libs/ValidationUtils';

import type {DynamicFormHTMLInputElement} from '@src/types/onyx';

/** Checks Wise describes for an answered field: its regex and lengths for typed answers, and an allowed value for a choice */
function getAnswerErrors(input: DynamicFormHTMLInputElement, answer: string, translate: LocalizedTranslate): string[] {
    switch (input.type) {
        case 'select':
        case 'radio':
            return input.valuesAllowed?.some((value) => value.key === answer) ? [] : [translate('dynamicForm.error.invalidOption')];
        case 'date':
            return isValidDate(answer) ? [] : [translate('common.error.dateInvalid')];
        default:
            return getFormatErrors(
                {
                    key: input.key,
                    regex: input.validationRegexp ?? undefined,
                    minLength: input.minLength ?? undefined,
                    maxLength: input.maxLength ?? undefined,
                    example: input.example ?? undefined,
                },
                answer,
                translate,
            );
    }
}

/** Errors for HTML inputs, keyed by draft key, in the shape FormProvider's `validate` returns */
function getHTMLInputErrors(inputs: DynamicFormHTMLInputElement[], values: DynamicFormValues, translate: LocalizedTranslate): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const input of inputs) {
        const answer = values[input.key];
        if (!isAnswered(answer)) {
            if (input.required) {
                addErrorMessage(errors, input.key, translate('common.error.fieldRequired'));
            }
            continue;
        }
        for (const message of getAnswerErrors(input, typeof answer === 'string' ? answer : '', translate)) {
            addErrorMessage(errors, input.key, message);
        }
    }
    return errors;
}

export default getHTMLInputErrors;
