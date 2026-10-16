import type {DynamicFormValues} from '@components/DynamicForm/types';

import type {DynamicFormElement, DynamicFormField} from '@src/types/onyx';

import {getInputDefinition} from './elements/registry';
import {getVisibleInputs} from './getVisibleContent';

/** The answers to the inputs of a page's content the user can see, so answers left on inputs hidden later are not submitted. Pass the whole form as `allFields` when `elements` is one page of it. */
function getContentAnswers(elements: DynamicFormElement[], values: DynamicFormValues, allFields?: DynamicFormField[]): DynamicFormValues {
    return Object.fromEntries(getVisibleInputs(elements, values, allFields).flatMap((input) => Object.entries(getInputDefinition(input).getAnswers(input, values))));
}

export default getContentAnswers;
