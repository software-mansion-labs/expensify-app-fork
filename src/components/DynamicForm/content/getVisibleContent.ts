import isShown from '@components/DynamicForm/shared/isShown';
import type {DynamicFormValues} from '@components/DynamicForm/types';

import type {DynamicFormElement, DynamicFormField, DynamicFormInputElement} from '@src/types/onyx';

import getContentFields from './elements/ExpensifyInput/getContentFields';
import {getElementDefinition, getStaticDefinition, isInputElement} from './elements/registry';

/** Elements that introduce inputs, such as headings, with no visible input before the next such element, or before the end */
function getOrphanIntroductions(elements: DynamicFormElement[]): Set<DynamicFormElement> {
    const orphanIntroductions = new Set<DynamicFormElement>();
    let pendingIntroduction: DynamicFormElement | undefined;
    for (const element of elements) {
        if (isInputElement(element)) {
            pendingIntroduction = undefined;
        } else if (getStaticDefinition(element).introducesInputs) {
            if (pendingIntroduction) {
                orphanIntroductions.add(pendingIntroduction);
            }
            pendingIntroduction = element;
        }
    }
    if (pendingIntroduction) {
        orphanIntroductions.add(pendingIntroduction);
    }
    return orphanIntroductions;
}

/**
 * The elements the user sees right now. A heading with no visible input before the next heading is left out, so a hidden or unknown field never leaves an orphan title.
 * `allFields` is the whole form when `elements` is one page of it, since a controlling field can sit on another page.
 */
function getVisibleContent(elements: DynamicFormElement[], values: DynamicFormValues, allFields?: DynamicFormField[]): DynamicFormElement[] {
    const controllers = allFields ?? getContentFields(elements);
    const shownElements = elements.filter((element) => isShown(getElementDefinition(element).getCondition(element), values, controllers));
    const orphanIntroductions = getOrphanIntroductions(shownElements);
    return shownElements.filter((element) => !orphanIntroductions.has(element));
}

/** The inputs the user sees right now, which are the ones validated and submitted */
function getVisibleInputs(elements: DynamicFormElement[], values: DynamicFormValues, allFields?: DynamicFormField[]): DynamicFormInputElement[] {
    return getVisibleContent(elements, values, allFields).filter(isInputElement);
}

export default getVisibleContent;
export {getVisibleInputs};
