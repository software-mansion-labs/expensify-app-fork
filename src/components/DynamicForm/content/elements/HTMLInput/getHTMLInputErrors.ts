import getFormatErrors from '@components/DynamicForm/content/elements/shared/getFormatErrors';
import {isAnswered} from '@components/DynamicForm/shared';
import type {DynamicFormError, DynamicFormValues} from '@components/DynamicForm/types';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import {isValidDate} from '@libs/ValidationUtils';

import type {DynamicFormHTMLInputElement} from '@src/types/onyx';

import {isAllowedValue} from './getHTMLInputChoices';

/** Checks Wise describes for an answered input: its regex and lengths for typed answers, and an allowed value for a choice */
function getAnswerErrors(input: DynamicFormHTMLInputElement, answer: string, translate: LocalizedTranslate): string[] {
    switch (input.type) {
        case 'select':
        case 'radio':
            return isAllowedValue(input, answer) ? [] : [translate('dynamicForm.error.invalidOption')];
        case 'date':
            return isValidDate(answer) ? [] : [translate('common.error.dateInvalid')];
        case 'text':
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
        default: {
            const exhaustiveCheck: never = input.type;
            return exhaustiveCheck;
        }
    }
}

/** The errors of one HTML input: required when unanswered, else the checks Wise describes */
function getHTMLInputErrors(input: DynamicFormHTMLInputElement, values: DynamicFormValues, translate: LocalizedTranslate): DynamicFormError[] {
    const answer = values[input.key];
    if (!isAnswered(answer)) {
        return input.required ? [[input.key, translate('common.error.fieldRequired')]] : [];
    }
    return getAnswerErrors(input, typeof answer === 'string' ? answer : '', translate).map((message): DynamicFormError => [input.key, message]);
}

export default getHTMLInputErrors;
