import type {ConfirmationRowHandlers} from '@components/DynamicForm/content/elements/types';
import type {DynamicFormValues} from '@components/DynamicForm/types';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';
import type {SummaryGroupRow} from '@components/SubStepForms/ConfirmationStep';

import {getLetterAvatarURLForName} from '@libs/UserAvatarUtils';

import type {DynamicFormField, DynamicFormListField} from '@src/types/onyx';

import noop from 'lodash/noop';

import formatDynamicFieldValue from './model/formatDynamicFieldValue';
import getFieldLabel from './model/getFieldLabel';
import isSensitiveField from './model/isSensitiveField';
import {getListItems} from './model/listItems';
import maskSensitiveValue from './model/maskSensitiveValue';
import summarizeListItem, {getListItemFallbackTitle} from './model/summarizeListItem';

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
            title: isSensitiveField(field) ? maskSensitiveValue(answer) : answer,
            shouldShowRightIcon: isEditable,
            onPress: isEditable ? onEdit : noop,
            interactive: isEditable,
        },
    ];
}

export default getConfirmationRows;
