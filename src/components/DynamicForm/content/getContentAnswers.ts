import type {DynamicFormValues} from '@components/DynamicForm/types';

import type {DynamicFormField, DynamicFormInputElement, DynamicFormSchemaElement} from '@src/types/onyx';

import {getFieldAnswers} from './elements/ExpensifyInput/getSubmittedAnswers';
import {getVisibleInputs} from './getVisibleContent';

/** The answers one input holds, in the shape its element type submits them */
function getInputAnswers(input: DynamicFormInputElement, values: DynamicFormValues): DynamicFormValues {
    switch (input.elementType) {
        case 'HTMLInput':
            return values[input.key] === undefined ? {} : {[input.key]: values[input.key]};
        case 'ExpensifyInput':
            return getFieldAnswers(input, values);
        default: {
            const exhaustiveCheck: never = input;
            return exhaustiveCheck;
        }
    }
}

/** The answers to the inputs of a page's content the user can see, so answers left on inputs hidden later are not submitted. Pass the whole form as `allFields` when `content` is one page of it. */
function getContentAnswers(content: DynamicFormSchemaElement[], values: DynamicFormValues, allFields?: DynamicFormField[]): DynamicFormValues {
    return Object.fromEntries(getVisibleInputs(content, values, allFields).flatMap((input) => Object.entries(getInputAnswers(input, values))));
}

export default getContentAnswers;
