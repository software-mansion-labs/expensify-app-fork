import {getLocalizedText, isListItem, isShown} from '@components/DynamicForm/shared';
import type {DynamicFormValues} from '@components/DynamicForm/types';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {DynamicFormField, DynamicFormListField, DynamicFormListItem} from '@src/types/onyx';

import {formatDynamicFieldValue, getAnswerKeys, getFieldLabel, hasSensitiveAnswer} from './field';

const SENSITIVE_KEY_SEPARATOR = '~';

const DESCRIPTION_ANSWER_LIMIT = 2;

/** Long answers, such as a full address, would crowd the row, so they are left out of its description */
const TYPES_LEFT_OUT_OF_DESCRIPTION = new Set<DynamicFormField['type']>(['date', 'address', 'country', 'file']);

/** Memory key of one sensitive answer of a list entry, since sensitive answers never reach the draft */
function getListItemSensitiveKey(listKey: string, itemID: string, fieldKey: string): string {
    return [listKey, itemID, fieldKey].join(SENSITIVE_KEY_SEPARATOR);
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

/** The entries stored under a list field's key, ignoring anything malformed */
function getListItems(value: unknown): DynamicFormListItem[] {
    if (!Array.isArray(value)) {
        return [];
    }
    const items: unknown[] = value;
    return items.filter(isListItem);
}

/** The fields the user sees right now, which are also the only ones validated. `allFields` is the whole form when `fields` is one page of it, since a controlling field can sit on another page. */
function getVisibleFields(fields: DynamicFormField[], values: DynamicFormValues, allFields = fields): DynamicFormField[] {
    return fields.filter((field) => isShown(field.showWhen, values, allFields));
}

/** The keys of an entry's answers that stay out of the draft, given the fields of the list's entries */
function getListItemSensitiveAnswerKeys(itemFields: DynamicFormField[]): string[] {
    return itemFields.filter(hasSensitiveAnswer).flatMap(getAnswerKeys);
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
    return Object.keys(values).filter((key) => key.startsWith(`${field.key}${SENSITIVE_KEY_SEPARATOR}`) && !keptKeys.has(key));
}

/** The noun for one entry of the list, or the list's label, which names an entry whose answers give it no name */
function getListItemFallbackTitle(field: DynamicFormListField, translate: LocalizedTranslate): string {
    return getLocalizedText(translate, field.itemLabelKey, field.itemLabel) ?? getFieldLabel(field, translate);
}

/** Title of the row that adds an entry, and of the editor of a new one */
function getListItemAddTitle(field: DynamicFormListField, translate: LocalizedTranslate): string {
    const itemLabel = getLocalizedText(translate, field.itemLabelKey, field.itemLabel);
    return itemLabel ? translate('dynamicForm.addItem', {item: itemLabel}) : translate('common.add');
}

/** The leading run of text answers names the row, as first and last name do. Up to two short remaining answers describe it. Hidden answers are left out, and an entry with no shown answer is named by `fallbackTitle`. */
function summarizeListItem(item: DynamicFormListItem, itemFields: DynamicFormField[], translate: LocalizedTranslate, fallbackTitle: string): {title: string; description: string} {
    const shownFields = getVisibleFields(itemFields, item).filter((field) => !field.sensitive && formatDynamicFieldValue(field, item, translate) !== '');
    const firstTextIndex = shownFields.findIndex((field) => field.type === 'text');
    const titleFields: DynamicFormField[] = [];
    for (const field of shownFields.slice(Math.max(firstTextIndex, 0))) {
        if (field.type !== 'text') {
            break;
        }
        titleFields.push(field);
    }
    const firstShownField = shownFields.at(0);
    if (titleFields.length === 0 && firstShownField) {
        titleFields.push(firstShownField);
    }
    const title = titleFields.map((field) => formatDynamicFieldValue(field, item, translate)).join(' ') || fallbackTitle;
    const description = shownFields
        .filter((field) => !titleFields.includes(field) && !TYPES_LEFT_OUT_OF_DESCRIPTION.has(field.type))
        .slice(0, DESCRIPTION_ANSWER_LIMIT)
        .map((field) => formatDynamicFieldValue(field, item, translate))
        .join(', ');
    return {title, description};
}

/** The answers one field holds: its own and those of its parts. List entries get their sensitive answers back from memory. */
function getFieldAnswers(field: DynamicFormField, values: DynamicFormValues): DynamicFormValues {
    const answers: DynamicFormValues = {};
    for (const key of getAnswerKeys(field)) {
        if (values[key] !== undefined) {
            answers[key] = values[key];
        }
    }
    if (field.type === 'list' && values[field.key] !== undefined) {
        answers[field.key] = getListItems(values[field.key]).map((item) => ({
            id: item.id,
            ...getSubmittedAnswers(field.itemFields, {...item, ...getListItemSensitiveAnswers(field, item.id, values)}),
        }));
    }
    return answers;
}

/** The answers to the fields the user can see, so answers left on fields hidden later are not submitted. Pass the whole form as `allFields` when `fields` is one page of it. */
function getSubmittedAnswers(fields: DynamicFormField[], values: DynamicFormValues, allFields = fields): DynamicFormValues {
    return Object.fromEntries(getVisibleFields(fields, values, allFields).flatMap((field) => Object.entries(getFieldAnswers(field, values))));
}

export {
    findListField,
    getFieldAnswers,
    getListFields,
    getListItemAddTitle,
    getListItemFallbackTitle,
    getListItems,
    getListItemSensitiveAnswerKeys,
    getListItemSensitiveAnswers,
    getListItemSensitiveKey,
    getRemovedListItemSensitiveKeys,
    getSubmittedAnswers,
    getVisibleFields,
    summarizeListItem,
};
