import {getVisibleFields} from '@components/DynamicForm/content/content';
import {fieldDefinition} from '@components/DynamicForm/content/definitions';
import type {DynamicFormFlowPage, DynamicFormValues} from '@components/DynamicForm/types';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';
import type {SummaryGroup} from '@components/SubStepForms/ConfirmationStep';

import type {DynamicFormField} from '@src/types/onyx';

import {getPageSectionName, isPageShown} from './pages';

/** One section per shown page holding its visible answers, with each list entry as an avatar row and an empty list as a plain row. Tapping a row opens the page or entry to edit. Readonly rows open nothing. */
function getConfirmationItems(
    pages: DynamicFormFlowPage[],
    allFields: DynamicFormField[],
    values: DynamicFormValues,
    translate: LocalizedTranslate,
    onEditPage: (pageIndex: number) => void,
    onEditListItem: (listKey: string, itemID: string) => void,
): SummaryGroup[] {
    return pages.flatMap((page, pageIndex): SummaryGroup[] => {
        if (!isPageShown(page, values, allFields)) {
            return [];
        }

        const fields = getVisibleFields(page.content, values, allFields);
        const sectionName = getPageSectionName(page, values, translate, allFields);
        // The section heading names a list that is alone in it, so the list's own label is shown only when nothing else names the entries or other answers sit beside them
        const isNamedBySection = !!sectionName && fields.length === 1;
        const handleEdit = () => onEditPage(pageIndex);

        return [
            {
                id: page.key,
                name: sectionName,
                rows: fields.flatMap((field) => fieldDefinition.getConfirmationRows(field, values, translate, {onEditPage: handleEdit, onEditListItem, isNamedBySection})),
            },
        ];
    });
}

export default getConfirmationItems;
