import {getInputDefinition} from '@components/DynamicForm/content/elements/registry';
import {getVisibleInputs} from '@components/DynamicForm/content/getVisibleContent';
import {getPageSectionName} from '@components/DynamicForm/flow/pages/getPageTitle';
import isPageShown from '@components/DynamicForm/flow/pages/isPageShown';
import type {DynamicFormFlowPage} from '@components/DynamicForm/flow/types';
import type {DynamicFormValues} from '@components/DynamicForm/types';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';
import type {SummaryGroup} from '@components/SubStepForms/ConfirmationStep';

import type {DynamicFormField} from '@src/types/onyx';

/** One section per shown page holding its visible answers, each drawn by the rules of its element type. Tapping a row opens the page or entry to edit. Readonly rows open nothing. */
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
        const handlers = {onEdit: () => onEditPage(pageIndex), onEditListItem};
        return [
            {
                id: page.key,
                name: getPageSectionName(page, values, translate, allFields),
                rows: getVisibleInputs(page.content, values, allFields).flatMap((input) => getInputDefinition(input).getConfirmationRows(input, values, translate, handlers)),
            },
        ];
    });
}

export default getConfirmationItems;
