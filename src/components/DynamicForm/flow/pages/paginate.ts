import {getElementDefinition, getInputDefinition, isInputElement} from '@components/DynamicForm/content/elements/registry';
import type {DynamicFormFlowPage} from '@components/DynamicForm/flow/types';

import CONST from '@src/CONST';
import type {DynamicFormElement, DynamicFormInputElement} from '@src/types/onyx';

/**
 * Groups a flat list of elements into pages. Inputs whose element type says they need room get a page of their own,
 * and the other inputs share a page up to `MAX_FIELDS_PER_PAGE` in a row. An input with a condition joins the page of its controller and does not count toward that limit.
 * Headings, banners and descriptions join the page of the input after them. The pages have no title and no key, `getPages` names them.
 */
function paginate(elements: DynamicFormElement[]): DynamicFormFlowPage[] {
    const pages: DynamicFormFlowPage[] = [];
    const pageOfKey = new Map<string, DynamicFormFlowPage>();
    let sharedPage: DynamicFormFlowPage | undefined;
    let sharedQuestionCount = 0;
    let pendingElements: DynamicFormElement[] = [];

    const getPageFor = (input: DynamicFormInputElement): DynamicFormFlowPage => {
        const condition = getElementDefinition(input).getCondition(input);
        const controllerPage = condition ? pageOfKey.get(condition.key) : undefined;
        if (controllerPage) {
            return controllerPage;
        }
        if (getInputDefinition(input).needsOwnPage(input)) {
            const ownPage: DynamicFormFlowPage = {key: '', content: []};
            pages.push(ownPage);
            sharedPage = undefined;
            return ownPage;
        }
        if (!sharedPage || sharedQuestionCount >= CONST.DYNAMIC_FORM.MAX_FIELDS_PER_PAGE) {
            sharedPage = {key: '', content: []};
            sharedQuestionCount = 0;
            pages.push(sharedPage);
        }
        sharedQuestionCount++;
        return sharedPage;
    };

    for (const element of elements) {
        if (!isInputElement(element)) {
            pendingElements.push(element);
            continue;
        }
        const page = getPageFor(element);
        page.content.push(...pendingElements, element);
        pendingElements = [];
        pageOfKey.set(element.key, page);
    }
    pages.at(-1)?.content.push(...pendingElements);
    return pages;
}

export default paginate;
