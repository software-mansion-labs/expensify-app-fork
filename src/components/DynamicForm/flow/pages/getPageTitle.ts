import getLoneField from '@components/DynamicForm/content/getLoneField';
import getVisibleContent from '@components/DynamicForm/content/getVisibleContent';
import getLocalizedText, {getFieldLabel} from '@components/DynamicForm/shared/getLocalizedText';
import type {DynamicFormValues} from '@components/DynamicForm/types';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {DynamicFormField, DynamicFormPage} from '@src/types/onyx';

function getPageLoneField(page: DynamicFormPage, values: DynamicFormValues, allFields?: DynamicFormField[]) {
    return getLoneField(getVisibleContent(page.content, values, allFields));
}

/** The page's own title, else the schema's wording of its lone question. A label never names a section, since the label is already on the question's row. */
function getPageSectionName(page: DynamicFormPage, values: DynamicFormValues, translate: LocalizedTranslate, allFields?: DynamicFormField[]): string {
    const ownTitle = getLocalizedText(translate, page.titleKey, page.title);
    if (ownTitle) {
        return ownTitle;
    }
    const loneField = getPageLoneField(page, values, allFields);
    return (loneField && getLocalizedText(translate, loneField.questionKey, loneField.question)) ?? '';
}

/** The page's section name, else the label of its lone question. An untitled page with several questions has no headline, since no one of them names the page. */
function getPageTitle(page: DynamicFormPage, values: DynamicFormValues, translate: LocalizedTranslate, allFields?: DynamicFormField[]): string {
    const sectionName = getPageSectionName(page, values, translate, allFields);
    if (sectionName) {
        return sectionName;
    }
    const loneField = getPageLoneField(page, values, allFields);
    return loneField ? getFieldLabel(loneField, translate) : '';
}

export default getPageTitle;
export {getPageSectionName};
