import formatDynamicFieldValue from '@components/DynamicForm/content/elements/ExpensifyInput/model/formatDynamicFieldValue';
import isSensitiveField from '@components/DynamicForm/content/elements/ExpensifyInput/model/isSensitiveField';
import {getListItems} from '@components/DynamicForm/content/elements/ExpensifyInput/model/listItems';
import maskSensitiveValue from '@components/DynamicForm/content/elements/ExpensifyInput/model/maskSensitiveValue';
import summarizeListItem, {getListItemFallbackTitle} from '@components/DynamicForm/content/elements/ExpensifyInput/model/summarizeListItem';
import formatHTMLInputValue from '@components/DynamicForm/content/elements/HTMLInput/formatHTMLInputValue';
import {getVisibleInputs} from '@components/DynamicForm/content/getVisibleContent';
import {getPageSectionName} from '@components/DynamicForm/flow/pages/getPageTitle';
import isPageShown from '@components/DynamicForm/flow/pages/isPageShown';
import {getFieldLabel} from '@components/DynamicForm/shared/getLocalizedText';
import type {DynamicFormValues} from '@components/DynamicForm/types';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';
import type {SummaryGroup, SummaryGroupRow} from '@components/SubStepForms/ConfirmationStep';

import {getLetterAvatarURLForName} from '@libs/UserAvatarUtils';

import type {DynamicFormField, DynamicFormInputElement, DynamicFormListField, DynamicFormPage} from '@src/types/onyx';

import noop from 'lodash/noop';

/** One avatar row per list entry, which opens the entry. A readonly list gets plain rows that open nothing. */
function getListItemRows(
    field: DynamicFormListField,
    values: DynamicFormValues,
    translate: LocalizedTranslate,
    onEditListItem: (listKey: string, itemID: string) => void,
): SummaryGroupRow[] {
    return getListItems(values[field.key]).map((item): SummaryGroupRow => {
        const {title, description} = summarizeListItem(item, field.itemFields, translate, getListItemFallbackTitle(field, translate));
        if (field.readonly) {
            return {id: `${field.key}-${item.id}`, title, description, shouldShowRightIcon: false, onPress: noop, interactive: false};
        }
        return {
            kind: 'avatar',
            id: `${field.key}-${item.id}`,
            title,
            description,
            avatarSource: getLetterAvatarURLForName(title),
            onPress: () => onEditListItem(field.key, item.id),
        };
    });
}

/** The row of an App-format field: its entries when it is a list that has some, else its answer */
function getFieldRows(
    field: DynamicFormField,
    values: DynamicFormValues,
    translate: LocalizedTranslate,
    onEdit: () => void,
    onEditListItem: (listKey: string, itemID: string) => void,
): SummaryGroupRow[] {
    const listItemRows = field.type === 'list' ? getListItemRows(field, values, translate, onEditListItem) : [];
    if (listItemRows.length > 0) {
        return listItemRows;
    }
    const answer = formatDynamicFieldValue(field, values, translate);
    const isEditable = !field.readonly;
    return [
        {
            id: field.key,
            description: getFieldLabel(field, translate),
            title: isSensitiveField(field) ? maskSensitiveValue(answer) : answer,
            shouldShowRightIcon: isEditable,
            onPress: isEditable ? onEdit : noop,
            interactive: isEditable,
        },
    ];
}

/** The rows of one input, drawn by the rules of its element type */
function getInputRows(
    input: DynamicFormInputElement,
    values: DynamicFormValues,
    translate: LocalizedTranslate,
    onEdit: () => void,
    onEditListItem: (listKey: string, itemID: string) => void,
): SummaryGroupRow[] {
    switch (input.elementType) {
        case 'HTMLInput':
            return [{id: input.key, description: input.name, title: formatHTMLInputValue(input, values), shouldShowRightIcon: true, onPress: onEdit}];
        case 'ExpensifyInput':
            return getFieldRows(input, values, translate, onEdit, onEditListItem);
        default: {
            const exhaustiveCheck: never = input;
            return exhaustiveCheck;
        }
    }
}

/** One section per shown page holding its visible answers, with each list entry as an avatar row and an empty list as a plain row. Tapping a row opens the page or entry to edit. Readonly rows open nothing. */
function getConfirmationItems(
    pages: DynamicFormPage[],
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
        const handleEdit = () => onEditPage(pageIndex);
        return [
            {
                id: page.key,
                name: getPageSectionName(page, values, translate, allFields),
                rows: getVisibleInputs(page.content, values, allFields).flatMap((input) => getInputRows(input, values, translate, handleEdit, onEditListItem)),
            },
        ];
    });
}

export default getConfirmationItems;
