import {isFieldVisible} from '@components/DynamicForm/shared/getVisibleFields';
import type {DynamicFormValues} from '@components/DynamicForm/types';

import type {DynamicFormElement, DynamicFormField, DynamicFormInputElement, DynamicFormSchemaElement} from '@src/types/onyx';

import {getContentElements, getContentFields, isInputElement} from './parseContent';

/** HTML inputs, banners and descriptions have no `showWhen`, since Wise shows or hides fields only by sending new requirements */
function isElementVisible(element: DynamicFormElement, values: DynamicFormValues, allFields: DynamicFormField[]): boolean {
    switch (element.elementType) {
        case 'Heading':
        case 'ExpensifyInput':
            return isFieldVisible(element, values, allFields);
        case 'HTMLInput':
        case 'Banner':
        case 'Description':
            return true;
        default: {
            const exhaustiveCheck: never = element;
            return exhaustiveCheck;
        }
    }
}

/** Headings with no visible input before the next heading, or before the end */
function getOrphanHeadings(elements: DynamicFormElement[]): Set<DynamicFormElement> {
    const orphanHeadings = new Set<DynamicFormElement>();
    let pendingHeading: DynamicFormElement | undefined;
    for (const element of elements) {
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
    return orphanHeadings;
}

/**
 * The elements the user sees right now. A heading with no visible input before the next heading is left out, so a hidden or unknown field never leaves an orphan title.
 * `allFields` is the whole form when `content` is one page of it, since a controlling field can sit on another page.
 */
function getVisibleContent(content: DynamicFormSchemaElement[], values: DynamicFormValues, allFields?: DynamicFormField[]): DynamicFormElement[] {
    const elements = getContentElements(content);
    const controllers = allFields ?? getContentFields(elements);
    const shownElements = elements.filter((element) => isElementVisible(element, values, controllers));
    const orphanHeadings = getOrphanHeadings(shownElements);
    return shownElements.filter((element) => !orphanHeadings.has(element));
}

/** The inputs the user sees right now, which are the ones validated and submitted */
function getVisibleInputs(content: DynamicFormSchemaElement[], values: DynamicFormValues, allFields?: DynamicFormField[]): DynamicFormInputElement[] {
    return getVisibleContent(content, values, allFields).filter(isInputElement);
}

export default getVisibleContent;
export {getVisibleInputs};
