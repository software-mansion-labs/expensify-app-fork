import type {DynamicFormValues} from '@components/DynamicForm/types';

/** A text answer, or an empty string when the answer is missing or of another type */
function getTextAnswer(answer: DynamicFormValues[string]): string {
    return typeof answer === 'string' ? answer : '';
}

export default getTextAnswer;
