import type {FormValue} from '@components/Form/types';

/** A checkbox that is not ticked is unanswered. `isNoAnAnswer` is for a boolean asked as a Yes/No question, where No answers it. */
function isAnswered(value: FormValue | undefined, isNoAnAnswer = false): boolean {
    if (typeof value === 'boolean') {
        return value || isNoAnAnswer;
    }
    if (typeof value === 'string') {
        return value.trim() !== '';
    }
    if (Array.isArray(value)) {
        return value.length > 0;
    }
    return value instanceof Date;
}

export default isAnswered;
