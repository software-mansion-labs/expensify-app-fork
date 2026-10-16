import type {DynamicFormValues} from '@components/DynamicForm/types';

import type {DynamicFormHTMLInputElement} from '@src/types/onyx';

/** An answer as the user reads it, for the confirmation page */
function formatHTMLInputValue(input: DynamicFormHTMLInputElement, values: DynamicFormValues): string {
    const answer = values[input.key];
    if (typeof answer !== 'string') {
        return '';
    }
    switch (input.type) {
        case 'select':
        case 'radio':
            return input.valuesAllowed?.find((value) => value.key === answer)?.name ?? answer;
        default:
            return answer;
    }
}

export default formatHTMLInputValue;
