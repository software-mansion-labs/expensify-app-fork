import toFormErrors from '@components/DynamicForm/shared/toFormErrors';
import type {DynamicFormValues} from '@components/DynamicForm/types';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {DynamicFormElement, DynamicFormField} from '@src/types/onyx';

import {getInputDefinition} from './elements/registry';
import {getVisibleInputs} from './getVisibleContent';

/** Errors for the inputs of a page's content the user can see, in the shape FormProvider's `validate` returns. Pass the whole form as `allFields` when a `showWhen` can name a field on another page. */
function getContentErrors(elements: DynamicFormElement[], values: DynamicFormValues, translate: LocalizedTranslate, allFields?: DynamicFormField[]): Record<string, string> {
    return toFormErrors(getVisibleInputs(elements, values, allFields).flatMap((input) => getInputDefinition(input).getErrors(input, values, translate)));
}

export default getContentErrors;
