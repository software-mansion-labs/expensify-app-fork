import {getContentFields} from '@components/DynamicForm/content/content';
import {findListField, getListItems} from '@components/DynamicForm/content/elements/ExpensifyInput/list';
import type {DynamicFormInputOptions, DynamicFormValues} from '@components/DynamicForm/types';

import type {PageConfig} from '@hooks/useSubPage/types';

import CONST from '@src/CONST';
import type {OnyxFormKey} from '@src/ONYXKEYS';

import {Str} from 'expensify-common';

import type {DynamicFormFlowActions, DynamicFormFlowPage, DynamicFormSubPageProps} from './types';

import {saveListItemAnswers, saveSensitiveListItems} from './answerStorage';
import {getAllFields} from './pages';

const PAGE_NAME_SEPARATOR = '~';
const NEW_ITEM_ID = 'new';

type ListItemEditorOptions = Pick<DynamicFormInputOptions, 'onRefreshRequirements'> & {
    formID: OnyxFormKey;
    pages: DynamicFormFlowPage[];
    values: DynamicFormValues;
    subPages: Array<PageConfig<DynamicFormSubPageProps>>;
    isEditing: boolean;
    currentPageName: string | undefined;
    moveTo: (pageIndex: number, turnOnEditMode?: boolean) => void;

    /** Goes back to a page without stacking a second copy of it */
    returnTo: (pageName: string) => void;
};

type ListItemEditor = Pick<DynamicFormFlowActions, 'onOpenListItemEditor' | 'onListItemSave' | 'onListItemsChange'> & {
    closeListItemEditor: (listKey: string) => void;
};

/** Route segment of a list entry's editor page, or of the page that adds one */
function getListItemPageName(listKey: string, itemID = NEW_ITEM_ID): string {
    return `${listKey}${PAGE_NAME_SEPARATOR}${itemID}`;
}

/** The list key and entry ID an editor page name points at, or undefined for any other page */
function parseListItemPageName(pageName: string | undefined): {listKey: string; itemID: string | undefined} | undefined {
    if (!pageName?.includes(PAGE_NAME_SEPARATOR)) {
        return undefined;
    }
    const [listKey = '', itemID] = pageName.split(PAGE_NAME_SEPARATOR);
    return {listKey, itemID: itemID === NEW_ITEM_ID ? undefined : itemID};
}

/** The page that holds a list, which its entry editors return to and whose step they highlight */
function findListPage(pages: DynamicFormFlowPage[], listKey: string): DynamicFormFlowPage | undefined {
    return pages.find((page) => !!findListField(getContentFields(page.content), listKey));
}

/** Opens, saves and closes the editor pages of list entries */
function getListItemEditor({formID, pages, values, subPages, isEditing, currentPageName, moveTo, returnTo, onRefreshRequirements}: ListItemEditorOptions): ListItemEditor {
    const allFields = getAllFields(pages);

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

export {findListPage, getListItemEditor, getListItemPageName, parseListItemPageName};
