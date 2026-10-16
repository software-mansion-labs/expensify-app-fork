import type {ConfirmationRowHandlers, InputElementDefinition} from '@components/DynamicForm/content/elements/types';
import {getLocalizedText} from '@components/DynamicForm/shared';
import type {DynamicFormValues} from '@components/DynamicForm/types';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';
import type {SummaryGroupRow} from '@components/SubStepForms/ConfirmationStep';

import {getLetterAvatarURLForName} from '@libs/UserAvatarUtils';

import CONST from '@src/CONST';
import type {DynamicFormExpensifyInputElement, DynamicFormField, DynamicFormListField, DynamicFormSchemaElement} from '@src/types/onyx';

import noop from 'lodash/noop';

import {formatDynamicFieldValue, getAnswerKeys, getFieldLabel, isSupportedFieldType, maskSensitiveValue, parseItemFields} from './field';
import {getFieldAnswers, getListItemFallbackTitle, getListItems, summarizeListItem} from './list';
import {getFieldErrors} from './validation';

const OWN_PAGE_TYPES = new Set<DynamicFormField['type']>(['address', 'file', 'multiselect', 'countryMultiselect', 'list']);

function isExpensifyInputElement(element: DynamicFormSchemaElement): element is DynamicFormExpensifyInputElement {
    return element.elementType === 'ExpensifyInput' && 'type' in element && typeof element.type === 'string' && isSupportedFieldType(element.type, element.key);
}

/** Fields that need room get a page of their own: addresses, files, multi-selects, lists, and selects that are dependent or large */
function needsOwnPage(field: DynamicFormField): boolean {
    if (OWN_PAGE_TYPES.has(field.type)) {
        return true;
    }
    if (field.type !== 'select') {
        return false;
    }
    return !!field.dependsOn || (field.values?.length ?? 0) > CONST.DYNAMIC_FORM.LARGE_SELECT_MIN_OPTIONS;
}

/** One avatar row per list entry, which opens the entry. A readonly list gets plain rows that open nothing. */
function getListItemRows(
    field: DynamicFormListField,
    values: DynamicFormValues,
    translate: LocalizedTranslate,
    onEditListItem: ConfirmationRowHandlers['onEditListItem'],
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

/** The rows of an App-format field: its entries when it is a list that has some, else its answer */
function getConfirmationRows(field: DynamicFormField, values: DynamicFormValues, translate: LocalizedTranslate, {onEdit, onEditListItem}: ConfirmationRowHandlers): SummaryGroupRow[] {
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
            title: field.sensitive ? maskSensitiveValue(answer) : answer,
            shouldShowRightIcon: isEditable,
            onPress: isEditable ? onEdit : noop,
            interactive: isEditable,
        },
    ];
}

/** A field in the App's own format */
const expensifyInputDefinition: InputElementDefinition<'ExpensifyInput'> = {
    parse: (element) => {
        if (!isExpensifyInputElement(element)) {
            return undefined;
        }
        return element.type === 'list' ? {...element, itemFields: parseItemFields(element.itemFields)} : element;
    },
    getCondition: (field) => field.showWhen,
    getErrors: getFieldErrors,
    getAnswers: getFieldAnswers,
    getSensitiveKeys: (field) => (field.sensitive ? getAnswerKeys(field) : []),
    getConfirmationRows,
    needsOwnPage,
    getHeadline: (field, translate) => ({question: getLocalizedText(translate, field.questionKey, field.question), label: getFieldLabel(field, translate)}),
};

export default expensifyInputDefinition;
