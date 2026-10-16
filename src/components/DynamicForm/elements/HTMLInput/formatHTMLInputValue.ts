import type {DynamicFormValues} from '@components/DynamicForm/types';

import type {DynamicFormHTMLInputElement} from '@src/types/onyx';

import {getAllowedValueName} from './getHTMLInputChoices';

/** An answer as the user reads it, for the confirmation page */
function formatHTMLInputValue(input: DynamicFormHTMLInputElement, values: DynamicFormValues): string {
    const answer = values[input.key];
    if (typeof answer !== 'string') {
        return '';
    }
    switch (input.type) {
        case 'select':
        case 'radio':
            return getAllowedValueName(input, answer);
        case 'text':
        case 'date':
            return answer;
        default: {
            const exhaustiveCheck: never = input.type;
            return exhaustiveCheck;
        }
    }
}

export default formatHTMLInputValue;
