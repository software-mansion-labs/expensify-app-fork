import type {DynamicFormValues} from '@components/DynamicForm/types';

/**
 * The prefill answers the draft does not hold yet. A key the draft already has is the user's, even when they cleared it.
 * Read-only rows are the exception: the user cannot change them, so they follow the prefill.
 */
function getMissingDraftAnswers(prefill: DynamicFormValues, draft: DynamicFormValues, readonlyKeys: ReadonlySet<string> = new Set()): DynamicFormValues {
    const missing: DynamicFormValues = {};
    for (const [key, value] of Object.entries(prefill)) {
        if (readonlyKeys.has(key)) {
            const readonlyValue = value ?? '';
            if ((draft[key] ?? '') !== readonlyValue) {
                missing[key] = readonlyValue;
            }
            continue;
        }
        if ((value || value === false) && draft[key] === undefined) {
            missing[key] = value;
        }
    }
    return missing;
}

export default getMissingDraftAnswers;
