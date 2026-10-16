import type {DynamicFormValues} from '@components/DynamicForm/types';

import type {DynamicFormCondition, DynamicFormField} from '@src/types/onyx';

/** Whether the answer to a `showWhen` controller is one the condition lists. A list answer matches when any chosen value is listed. */
function matchesCondition(controllingValue: DynamicFormValues[string], equals: string[]): boolean {
    if (Array.isArray(controllingValue)) {
        const chosenValues: unknown[] = controllingValue;
        return chosenValues.some((chosenValue) => typeof chosenValue === 'string' && equals.includes(chosenValue));
    }
    if (typeof controllingValue !== 'string' && typeof controllingValue !== 'boolean') {
        return false;
    }
    return equals.includes(String(controllingValue));
}

/** `checkedControllers` holds the controllers already followed, so a cycle of conditions ends */
function isShownWithin(condition: DynamicFormCondition | undefined, values: DynamicFormValues, controllers: DynamicFormField[], checkedControllers: Set<DynamicFormField>): boolean {
    if (!condition) {
        return true;
    }
    const controller = controllers.find((candidate) => candidate.key === condition.key);
    if (controller && !checkedControllers.has(controller) && !isShownWithin(controller.showWhen, values, controllers, new Set([...checkedControllers, controller]))) {
        return false;
    }
    return matchesCondition(values[condition.key], condition.equals);
}

/**
 * Whether something with this `showWhen` is shown: a field, a heading or a page. It stays hidden while its controller is hidden, so an answer left on a hidden field cannot reveal its dependents.
 * `controllers` are the fields a condition can name, which is the whole form when the condition sits on one page of it.
 */
function isShown(condition: DynamicFormCondition | undefined, values: DynamicFormValues, controllers: DynamicFormField[]): boolean {
    return isShownWithin(condition, values, controllers, new Set());
}

export default isShown;
