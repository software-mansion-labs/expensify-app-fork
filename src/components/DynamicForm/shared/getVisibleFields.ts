import type {DynamicFormValues} from '@components/DynamicForm/types';

import type {DynamicFormField, DynamicFormHeading} from '@src/types/onyx';

import isHeading from './isHeading';

/** What a `showWhen` can hide: a field, a heading or a page */
type DynamicFormConditionalItem = DynamicFormHeading | DynamicFormField;

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

function isFieldVisibleWithin(item: DynamicFormConditionalItem, values: DynamicFormValues, allFields: DynamicFormField[], checkedKeys: Set<string>): boolean {
    if (!item.showWhen) {
        return true;
    }
    const {key, equals} = item.showWhen;
    const controller = allFields.find((candidate) => candidate.key === key);
    // A heading can share its key with a field, and it is never a controller, so only field keys mark the chain
    const chainKeys = isHeading(item) ? checkedKeys : new Set([...checkedKeys, item.key]);
    if (controller && !checkedKeys.has(controller.key) && !isFieldVisibleWithin(controller, values, allFields, chainKeys)) {
        return false;
    }
    return matchesCondition(values[key], equals);
}

/** A field or heading stays hidden while its controlling field is hidden, so an answer left on a hidden field cannot reveal its dependents */
function isFieldVisible(item: DynamicFormConditionalItem, values: DynamicFormValues, allFields: DynamicFormField[]): boolean {
    return isFieldVisibleWithin(item, values, allFields, new Set());
}

/** The fields the user sees right now, which are also the only ones validated. `allFields` is the whole form when `fields` is one page of it, since a controlling field can sit on another page. */
function getVisibleFields(fields: DynamicFormField[], values: DynamicFormValues, allFields = fields): DynamicFormField[] {
    return fields.filter((field) => isFieldVisible(field, values, allFields));
}

export default getVisibleFields;
export {isFieldVisible};
