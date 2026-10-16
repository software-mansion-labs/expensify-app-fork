import type {DynamicFormValues} from '@components/DynamicForm/types';

import type {DynamicFormField, DynamicFormListField, DynamicFormListItem} from '@src/types/onyx';

import getAnswerKeys from './getAnswerKeys';
import hasSensitiveAnswer from './hasSensitiveAnswer';

const PAGE_NAME_SEPARATOR = '~';
const NEW_ITEM_ID = 'new';

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

/** Memory key of one sensitive answer of a list entry, since sensitive answers never reach the draft */
function getListItemSensitiveKey(listKey: string, itemID: string, fieldKey: string): string {
    return [listKey, itemID, fieldKey].join(PAGE_NAME_SEPARATOR);
}

function isListField(field: DynamicFormField): field is DynamicFormListField {
    return field.type === 'list';
}

function getListFields(fields: DynamicFormField[]): DynamicFormListField[] {
    return fields.filter(isListField);
}

function findListField(fields: DynamicFormField[], listKey: string): DynamicFormListField | undefined {
    return getListFields(fields).find((field) => field.key === listKey);
}

/** The keys of an entry's answers that stay out of the draft, given the fields of the list's entries */
function getListItemSensitiveAnswerKeys(itemFields: DynamicFormField[]): string[] {
    return itemFields.filter(hasSensitiveAnswer).flatMap(getAnswerKeys);
}

function isListItem(value: unknown): value is DynamicFormListItem {
    return typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'string';
}

/** The entries stored under a list field's key, ignoring anything malformed */
function getListItems(value: unknown): DynamicFormListItem[] {
    if (!Array.isArray(value)) {
        return [];
    }
    const items: unknown[] = value;
    return items.filter(isListItem);
}

/** An entry's sensitive answers, keyed by field key, from the answers kept in memory */
function getListItemSensitiveAnswers(field: DynamicFormListField, itemID: string, values: DynamicFormValues): DynamicFormValues {
    return Object.fromEntries(
        getListItemSensitiveAnswerKeys(field.itemFields).flatMap((answerKey) => {
            const answer = values[getListItemSensitiveKey(field.key, itemID, answerKey)];
            return answer === undefined ? [] : [[answerKey, answer]];
        }),
    );
}

/** Memory keys of sensitive answers whose entry the user has removed from the list */
function getRemovedListItemSensitiveKeys(field: DynamicFormListField, values: DynamicFormValues): string[] {
    const sensitiveKeys = getListItemSensitiveAnswerKeys(field.itemFields);
    const keptKeys = new Set(getListItems(values[field.key]).flatMap((item) => sensitiveKeys.map((answerKey) => getListItemSensitiveKey(field.key, item.id, answerKey))));
    return Object.keys(values).filter((key) => key.startsWith(`${field.key}${PAGE_NAME_SEPARATOR}`) && !keptKeys.has(key));
}

export {
    findListField,
    getListFields,
    getListItemPageName,
    getListItemSensitiveAnswerKeys,
    getListItemSensitiveAnswers,
    getListItemSensitiveKey,
    getListItems,
    getRemovedListItemSensitiveKeys,
    isListItem,
    parseListItemPageName,
};
