import getContentFields from '@components/DynamicForm/content/elements/ExpensifyInput/getContentFields';
import {findListField, getListItems} from '@components/DynamicForm/content/elements/ExpensifyInput/model/listItems';
import type {FlowPages} from '@components/DynamicForm/flow/getFlowPages';
import type {DynamicFormFlowActions, DynamicFormFlowPage} from '@components/DynamicForm/flow/types';
import type {DynamicFormInputOptions, DynamicFormValues} from '@components/DynamicForm/types';

import CONST from '@src/CONST';
import type {OnyxFormKey} from '@src/ONYXKEYS';
import type {DynamicFormField} from '@src/types/onyx';

import {Str} from 'expensify-common';

import {getListItemPageName} from './listItemPageName';
import saveListItemAnswers, {saveSensitiveListItems} from './saveListItemAnswers';

type ListItemEditorOptions = Pick<FlowPages, 'subPages'> &
    Pick<DynamicFormInputOptions, 'onRefreshRequirements'> & {
        formID: OnyxFormKey;
        pages: DynamicFormFlowPage[];
        allFields: DynamicFormField[];
        values: DynamicFormValues;
        isEditing: boolean;
        currentPageName: string | undefined;
        moveTo: (pageIndex: number, turnOnEditMode?: boolean) => void;

        /** Goes back to a page without stacking a second copy of it */
        returnTo: (pageName: string) => void;
    };

type ListItemEditor = Pick<DynamicFormFlowActions, 'onOpenListItemEditor' | 'onListItemSave' | 'onListItemsChange'> & {
    closeListItemEditor: (listKey: string) => void;
};

/** The page that holds a list, which its entry editors return to and whose step they highlight */
function findListPage(pages: DynamicFormFlowPage[], listKey: string): DynamicFormFlowPage | undefined {
    return pages.find((page) => !!findListField(getContentFields(page.content), listKey));
}

/** Opens, saves and closes the editor pages of list entries */
function getListItemEditor({formID, pages, allFields, values, subPages, isEditing, currentPageName, moveTo, returnTo, onRefreshRequirements}: ListItemEditorOptions): ListItemEditor {
    /** An entry opened from the confirmation page, or from a page edited from it, returns there */
    const closeListItemEditor = (listKey: string) => {
        const listPage = findListPage(pages, listKey);
        returnTo(isEditing || !listPage ? CONST.DYNAMIC_FORM.CONFIRMATION_PAGE_KEY : listPage.key);
    };

    const onOpenListItemEditor = (listKey: string, itemID?: string) => {
        const editorIndex = subPages.findIndex((page) => page.pageName === getListItemPageName(listKey, itemID));
        // moveTo(-1) would open the last sub-page, which is another entry's editor
        if (editorIndex === -1) {
            return;
        }
        moveTo(editorIndex, isEditing || currentPageName === CONST.DYNAMIC_FORM.CONFIRMATION_PAGE_KEY);
    };

    const onListItemSave = (listKey: string, itemID: string | undefined, itemValues: DynamicFormValues) => {
        const listField = findListField(allFields, listKey);
        if (!listField) {
            return;
        }
        // The add row is hidden once the list is full, but a stale link can still open the editor of a new entry
        const isListFull = listField.maxItems !== undefined && getListItems(values[listKey]).length >= listField.maxItems;
        if (!itemID && isListFull) {
            closeListItemEditor(listKey);
            return;
        }
        const savedItems = saveListItemAnswers(formID, listField, itemID ?? Str.guid(), !itemID, itemValues, values);
        // The editor saves outside the list's input, so a list that asks for fresh requirements on change asks here, as a removal does through its input
        if (listField.refreshOnChange) {
            onRefreshRequirements?.(listKey, savedItems);
        }
        closeListItemEditor(listKey);
    };

    const onListItemsChange: ListItemEditor['onListItemsChange'] = (listKey, items) => {
        const listField = findListField(allFields, listKey);
        if (!listField) {
            return;
        }
        saveSensitiveListItems(formID, listField, items, values);
    };

    return {closeListItemEditor, onOpenListItemEditor, onListItemSave, onListItemsChange};
}

export default getListItemEditor;
export {findListPage};
