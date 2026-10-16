import toFormErrors from '@components/DynamicForm/shared/toFormErrors';
import type {DynamicFormError, DynamicFormValues} from '@components/DynamicForm/types';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {DynamicFormField, DynamicFormInputElement, DynamicFormSchemaElement} from '@src/types/onyx';

import {getFieldErrors} from './elements/ExpensifyInput/validation/getDynamicFieldErrors';
import getHTMLInputErrors from './elements/HTMLInput/getHTMLInputErrors';
import {getVisibleInputs} from './getVisibleContent';

/** The errors of one input, checked by the rules of its element type */
function getInputErrors(input: DynamicFormInputElement, values: DynamicFormValues, translate: LocalizedTranslate): DynamicFormError[] {
    switch (input.elementType) {
        case 'HTMLInput':
            return getHTMLInputErrors(input, values, translate);
        case 'ExpensifyInput':
            return getFieldErrors(input, values, translate);
        default: {
            const exhaustiveCheck: never = input;
            return exhaustiveCheck;
        }
    }
}

/** Errors for the inputs of a page's content the user can see, in the shape FormProvider's `validate` returns. Pass the whole form as `allFields` when a `showWhen` can name a field on another page. */
function getContentErrors(content: DynamicFormSchemaElement[], values: DynamicFormValues, translate: LocalizedTranslate, allFields?: DynamicFormField[]): Record<string, string> {
    return toFormErrors(getVisibleInputs(content, values, allFields).flatMap((input) => getInputErrors(input, values, translate)));
}

export default getContentErrors;
