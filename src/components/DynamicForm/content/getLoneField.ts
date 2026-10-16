import type {DynamicFormElement, DynamicFormExpensifyInputElement} from '@src/types/onyx';

import {getInputCondition, isInputElement} from './parseContent';

/** The page's only question, if it is an App-format field. Fields it reveals, such as an "Other" description, do not count, so the layout stays put when they appear. */
function getLoneField(visibleContent: DynamicFormElement[]): DynamicFormExpensifyInputElement | undefined {
    const inputs = visibleContent.filter(isInputElement);
    const visibleKeys = new Set(inputs.map((input) => input.key));
    const questions = inputs.filter((input) => {
        const condition = getInputCondition(input);
        return !condition || !visibleKeys.has(condition.key);
    });
    const question = questions.at(0);
    return questions.length === 1 && question?.elementType === 'ExpensifyInput' ? question : undefined;
}

export default getLoneField;
