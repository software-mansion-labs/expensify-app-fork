import type {DynamicFormCondition, DynamicFormValues} from '@components/DynamicForm/types';

import type {DynamicFormField} from '@src/types/onyx';

/** A boolean answer matches as `'true'` or `'false'`, and a list answer matches when any chosen value is listed */
function matchesCondition(answer: DynamicFormValues[string], equals: string[]): boolean {
    if (Array.isArray(answer)) {
        const chosenValues: unknown[] = answer;
        return chosenValues.some((chosenValue) => typeof chosenValue === 'string' && equals.includes(chosenValue));
    }
    if (typeof answer !== 'string' && typeof answer !== 'boolean') {
        return false;
    }
    return equals.includes(String(answer));
}

/** `checkedKeys` holds the controllers already followed, so a cycle of conditions ends */
function isShownWithin(condition: DynamicFormCondition | undefined, values: DynamicFormValues, controllers: DynamicFormField[], checkedKeys: Set<string>): boolean {
    if (!condition) {
        return true;
    }
    const controller = controllers.find((candidate) => candidate.key === condition.key);
    if (controller && !checkedKeys.has(controller.key) && !isShownWithin(controller.showWhen, values, controllers, new Set([...checkedKeys, controller.key]))) {
        return false;
    }
    return matchesCondition(values[condition.key], condition.equals);
}

/**
 * Whether a field, heading or page with this `showWhen` is shown. It stays hidden while its controlling field is hidden, so an answer left on a hidden field cannot reveal its dependents.
 * `controllers` are the fields a condition can name: the whole form when the condition sits on one page of it.
 */
function isShown(condition: DynamicFormCondition | undefined, values: DynamicFormValues, controllers: DynamicFormField[]): boolean {
    return isShownWithin(condition, values, controllers, new Set());
}

/** The fields the user sees right now, which are also the only ones validated and submitted */
function getShownFields(fields: DynamicFormField[], values: DynamicFormValues, controllers = fields): DynamicFormField[] {
    return fields.filter((field) => isShown(field.showWhen, values, controllers));
}

export default isShown;
export {getShownFields};
