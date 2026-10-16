import {getInputDefinition} from '@components/DynamicForm/content/elements/registry';
import type {InputHeadline} from '@components/DynamicForm/content/elements/types';
import getLoneInput from '@components/DynamicForm/content/getLoneInput';
import getVisibleContent from '@components/DynamicForm/content/getVisibleContent';
import type {DynamicFormFlowPage} from '@components/DynamicForm/flow/types';
import getLocalizedText from '@components/DynamicForm/shared/getLocalizedText';
import type {DynamicFormValues} from '@components/DynamicForm/types';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {DynamicFormField} from '@src/types/onyx';

/** The wording of the page's lone question, if its element type gives the page any */
function getLoneInputHeadline(page: DynamicFormFlowPage, values: DynamicFormValues, translate: LocalizedTranslate, allFields?: DynamicFormField[]): InputHeadline | undefined {
    const loneInput = getLoneInput(getVisibleContent(page.content, values, allFields));
    return loneInput && getInputDefinition(loneInput).getHeadline(loneInput, translate);
}

/** The page's own title, else the wording of its lone question. A label never names a section, since the label is already on the question's row. */
function getPageSectionName(page: DynamicFormFlowPage, values: DynamicFormValues, translate: LocalizedTranslate, allFields?: DynamicFormField[]): string {
    const ownTitle = getLocalizedText(translate, page.titleKey, page.title);
    if (ownTitle) {
        return ownTitle;
    }
    return getLoneInputHeadline(page, values, translate, allFields)?.question ?? '';
}

/** The page's section name, else the label of its lone question. An untitled page with several questions has no headline, since no one of them names the page. */
function getPageTitle(page: DynamicFormFlowPage, values: DynamicFormValues, translate: LocalizedTranslate, allFields?: DynamicFormField[]): string {
    const sectionName = getPageSectionName(page, values, translate, allFields);
    if (sectionName) {
        return sectionName;
    }
    return getLoneInputHeadline(page, values, translate, allFields)?.label ?? '';
}

export default getPageTitle;
export {getPageSectionName};
