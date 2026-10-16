import type {DynamicFormValues} from '@components/DynamicForm/types';

import type {DynamicFormField, DynamicFormSchemaElement} from '@src/types/onyx';

import {getContentFields, getContentHTMLInputs} from './elements';
import getSubmittedAnswers from './getSubmittedAnswers';

/** The answers to the inputs of a page's content the user can see. An HTML input is always shown, so its answer is always submitted. */
function getContentAnswers(content: DynamicFormSchemaElement[], values: DynamicFormValues, allFields?: DynamicFormField[]): DynamicFormValues {
    const answers = getSubmittedAnswers(getContentFields(content), values, allFields);
    for (const input of getContentHTMLInputs(content)) {
        if (values[input.key] !== undefined) {
            answers[input.key] = values[input.key];
        }
    }
    return answers;
}

export default getContentAnswers;
