import DynamicFormInputRow from '@components/DynamicForm/content/elements/shared/DynamicFormInputRow';
import {getFieldLabel} from '@components/DynamicForm/shared/getLocalizedText';
import type {DynamicFormValues} from '@components/DynamicForm/types';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';
import MenuItemField from '@components/MenuItem/presets/MenuItemField';

import useLocalize from '@hooks/useLocalize';

import type {DynamicFormField} from '@src/types/onyx';

import React from 'react';

import formatDynamicFieldValue from './model/formatDynamicFieldValue';
import {getListItems} from './model/listItems';
import summarizeListItem, {getListItemFallbackTitle} from './model/summarizeListItem';

type ReadonlyFieldRowProps = {
    field: DynamicFormField;

    values: DynamicFormValues;
};

/** A list's answer is its entries, which formatDynamicFieldValue cannot name, so they are listed by their titles */
function formatReadonlyValue(field: DynamicFormField, values: DynamicFormValues, translate: LocalizedTranslate): string {
    if (field.type !== 'list') {
        return formatDynamicFieldValue(field, values, translate);
    }
    const fallbackTitle = getListItemFallbackTitle(field, translate);
    return getListItems(values[field.key])
        .map((item) => summarizeListItem(item, field.itemFields, translate, fallbackTitle).title)
        .join(', ');
}

/** A field the user cannot change, shown as its label and prefilled answer */
function ReadonlyFieldRow({field, values}: ReadonlyFieldRowProps) {
    const {translate} = useLocalize();

    return (
        <DynamicFormInputRow isMenuRow>
            <MenuItemField
                name={getFieldLabel(field, translate)}
                value={formatReadonlyValue(field, values, translate)}
            />
        </DynamicFormInputRow>
    );
}

export default ReadonlyFieldRow;
