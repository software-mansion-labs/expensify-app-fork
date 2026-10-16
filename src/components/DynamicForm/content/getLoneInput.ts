import type {DynamicFormElement, DynamicFormInputElement} from '@src/types/onyx';

import {getElementDefinition, isInputElement} from './elements/registry';

/** The page's only question. Inputs it reveals, such as an "Other" description, do not count, so the layout stays put when they appear. */
function getLoneInput(visibleContent: DynamicFormElement[]): DynamicFormInputElement | undefined {
    const inputs = visibleContent.filter(isInputElement);
    const visibleKeys = new Set(inputs.map((input) => input.key));
    const questions = inputs.filter((input) => {
        const condition = getElementDefinition(input).getCondition(input);
        return !condition || !visibleKeys.has(condition.key);
    });
    return questions.length === 1 ? questions.at(0) : undefined;
}

export default getLoneInput;
