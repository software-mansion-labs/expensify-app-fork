import type {DynamicFormValues} from '@components/DynamicForm/types';

import type {DynamicFormElement, DynamicFormExpensifyInputElement, DynamicFormField, DynamicFormHeading, DynamicFormSchemaElement} from '@src/types/onyx';

import {getContentElements, getContentFields, isInputElement} from './elements';
import isHeading from './isHeading';

type DynamicFormVisibleItem = DynamicFormHeading | DynamicFormField;

function isFieldVisibleWithin(item: DynamicFormVisibleItem, values: DynamicFormValues, allFields: DynamicFormField[], checkedKeys: Set<string>): boolean {
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
    const controllingValue = values[key];
    if (Array.isArray(controllingValue)) {
        const chosenValues: unknown[] = controllingValue;
        return chosenValues.some((chosenValue) => typeof chosenValue === 'string' && equals.includes(chosenValue));
    }
    if (typeof controllingValue !== 'string' && typeof controllingValue !== 'boolean') {
        return false;
    }
    return equals.includes(String(controllingValue));
}

/** A field or heading stays hidden while its controlling field is hidden, so an answer left on a hidden field cannot reveal its dependents */
function isFieldVisible(item: DynamicFormVisibleItem, values: DynamicFormValues, allFields: DynamicFormField[]): boolean {
    return isFieldVisibleWithin(item, values, allFields, new Set());
}

/** The fields the user sees right now, which are also the only ones validated. `allFields` is the whole form when `fields` is one page of it, since a controlling field can sit on another page. */
function getVisibleFields(fields: DynamicFormField[], values: DynamicFormValues, allFields = fields): DynamicFormField[] {
    return fields.filter((field) => isFieldVisible(field, values, allFields));
}

/** HTML inputs, banners and descriptions have no `showWhen`, since Wise shows or hides fields only by sending new requirements */
function isElementVisible(element: DynamicFormElement, values: DynamicFormValues, allFields: DynamicFormField[]): boolean {
    switch (element.elementType) {
        case 'Heading':
        case 'ExpensifyInput':
            return isFieldVisible(element, values, allFields);
        default:
            return true;
    }
}

/**
 * The elements the user sees right now. A heading with no visible input before the next heading is left out, so a hidden or unknown field never leaves an orphan title.
 * `allFields` is the whole form when `content` is one page of it, since a controlling field can sit on another page.
 */
function getVisibleContent(content: DynamicFormSchemaElement[], values: DynamicFormValues, allFields?: DynamicFormField[]): DynamicFormElement[] {
    const elements = getContentElements(content);
    const controllers = allFields ?? getContentFields(elements);
    const shownElements = elements.filter((element) => isElementVisible(element, values, controllers));
    const orphanHeadings = new Set<DynamicFormElement>();
    let pendingHeading: DynamicFormElement | undefined;
    for (const element of shownElements) {
        if (element.elementType === 'Heading') {
            if (pendingHeading) {
                orphanHeadings.add(pendingHeading);
            }
            pendingHeading = element;
        } else if (isInputElement(element)) {
            pendingHeading = undefined;
        }
    }
    if (pendingHeading) {
        orphanHeadings.add(pendingHeading);
    }
    return shownElements.filter((element) => !orphanHeadings.has(element));
}

/** The page's only question, if it is an App-format field. Fields it reveals, such as an "Other" description, do not count, so the layout stays put when they appear. */
function getLoneField(visibleContent: DynamicFormElement[]): DynamicFormExpensifyInputElement | undefined {
    const inputs = visibleContent.filter(isInputElement);
    const visibleKeys = new Set(inputs.map((input) => input.key));
    const questions = inputs.filter((input) => input.elementType === 'HTMLInput' || !input.showWhen || !visibleKeys.has(input.showWhen.key));
    const question = questions.at(0);
    return questions.length === 1 && question?.elementType === 'ExpensifyInput' ? question : undefined;
}

export default getVisibleFields;
export {getLoneField, getVisibleContent, isFieldVisible};
