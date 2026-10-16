import {getFormatErrors, maskSensitiveValue} from '@components/DynamicForm/content/elements/inputBehavior';
import type {InputElementDefinition} from '@components/DynamicForm/content/elements/types';
import {isAnswered} from '@components/DynamicForm/shared';
import type {DynamicFormError, DynamicFormValues} from '@components/DynamicForm/types';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';
import type {Choice} from '@components/RadioButtons';

import {isValidDate} from '@libs/ValidationUtils';

import type {DynamicFormHTMLInputElement, DynamicFormSchemaElement, DynamicFormWiseField} from '@src/types/onyx';

const HTML_INPUT_TYPES: Record<DynamicFormWiseField['type'], true> = {
    text: true,
    select: true,
    radio: true,
    date: true,
};

function isHTMLInputElement(element: DynamicFormSchemaElement): element is DynamicFormHTMLInputElement {
    return (
        element.elementType === 'HTMLInput' &&
        'type' in element &&
        typeof element.type === 'string' &&
        Object.hasOwn(HTML_INPUT_TYPES, element.type) &&
        'name' in element &&
        typeof element.name === 'string'
    );
}

/** Answers are kept in memory only unless the schema sets `sensitive` to false */
function isSensitiveHTMLInput(input: DynamicFormHTMLInputElement): boolean {
    return input.sensitive ?? true;
}

function findAllowedValue(input: DynamicFormHTMLInputElement, answer: string) {
    return input.valuesAllowed?.find((value) => value.key === answer);
}

/** The allowed values of a select or radio input, as the choices its picker lists */
function getHTMLInputChoices(input: DynamicFormHTMLInputElement): Choice[] {
    return (input.valuesAllowed ?? []).map((value) => ({value: value.key, label: value.name}));
}

/** An answer as the user reads it, for the confirmation page. A choice shows the name Wise gives it, or the answer itself once it is no longer allowed. */
function formatHTMLInputValue(input: DynamicFormHTMLInputElement, values: DynamicFormValues): string {
    const answer = values[input.key];
    if (typeof answer !== 'string') {
        return '';
    }
    switch (input.type) {
        case 'select':
        case 'radio':
            return findAllowedValue(input, answer)?.name ?? answer;
        case 'text':
        case 'date':
            return answer;
        default: {
            const exhaustiveCheck: never = input.type;
            return exhaustiveCheck;
        }
    }
}

/** Checks Wise describes for an answered input: its regex and lengths for typed answers, and an allowed value for a choice */
function getAnswerErrors(input: DynamicFormHTMLInputElement, answer: string, translate: LocalizedTranslate): string[] {
    switch (input.type) {
        case 'select':
        case 'radio':
            return findAllowedValue(input, answer) ? [] : [translate('dynamicForm.error.invalidOption')];
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

/** The answer as the confirmation page shows it, masked when it is sensitive */
function getConfirmationTitle(input: DynamicFormHTMLInputElement, values: DynamicFormValues): string {
    const title = formatHTMLInputValue(input, values);
    return isSensitiveHTMLInput(input) && title !== '' ? maskSensitiveValue(title) : title;
}

/** A Wise field, which Wise checks again when the answers arrive */
const htmlInputDefinition: InputElementDefinition<'HTMLInput'> = {
    parse: (element) => (isHTMLInputElement(element) ? element : undefined),
    getCondition: () => undefined,
    getErrors: getHTMLInputErrors,
    getAnswers: (input, values) => (values[input.key] === undefined ? {} : {[input.key]: values[input.key]}),
    getSensitiveKeys: (input) => (isSensitiveHTMLInput(input) ? [input.key] : []),
    getConfirmationRows: (input, values, translate, {onEdit}) => [
        {id: input.key, description: input.name, title: getConfirmationTitle(input, values), shouldShowRightIcon: true, onPress: onEdit},
    ],
    needsOwnPage: () => false,
    getHeadline: () => undefined,
};

export default htmlInputDefinition;
export {getHTMLInputChoices, isSensitiveHTMLInput};
