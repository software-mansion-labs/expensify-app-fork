import getHTMLInputErrors from '@components/DynamicForm/elements/HTMLInput/getHTMLInputErrors';
import type {DynamicFormValues} from '@components/DynamicForm/types';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {DynamicFormField, DynamicFormSchemaElement} from '@src/types/onyx';

import {getContentFields, getContentHTMLInputs} from './elements';
import getDynamicFieldErrors from './getDynamicFieldErrors';

/** Errors for the inputs of a page's content, whatever their format. Pass the whole form as `allFields` when a `showWhen` can name a field on another page. */
function getContentErrors(content: DynamicFormSchemaElement[], values: DynamicFormValues, translate: LocalizedTranslate, allFields?: DynamicFormField[]): Record<string, string> {
    return {
        ...getDynamicFieldErrors(getContentFields(content), values, translate, allFields),
        ...getHTMLInputErrors(getContentHTMLInputs(content), values, translate),
    };
}

export default getContentErrors;
