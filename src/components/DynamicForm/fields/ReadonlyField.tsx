import type {DynamicFormValues} from '@components/DynamicForm/types';
import formatDynamicFieldValue from '@components/DynamicForm/utils/formatDynamicFieldValue';
import {getFieldLabel} from '@components/DynamicForm/utils/getLocalizedText';
import {getListItems} from '@components/DynamicForm/utils/listItems';
import summarizeListItem, {getListItemFallbackTitle} from '@components/DynamicForm/utils/summarizeListItem';
import MenuItemField from '@components/MenuItem/presets/MenuItemField';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';
import type {DynamicFormField} from '@src/types/onyx';

import React from 'react';
import {View} from 'react-native';

type ReadonlyFieldProps = {
    field: DynamicFormField;
    values: DynamicFormValues;
};

/** A prefilled answer shown as a plain row, never edited */
function ReadonlyField({field, values}: ReadonlyFieldProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    // A list's answer is its entries, which formatDynamicFieldValue cannot name, so they are listed by their titles
    const value =
        field.type === 'list'
            ? getListItems(values[field.key])
                  .map((item, index) => summarizeListItem(item, field.itemFields, translate, getListItemFallbackTitle(field, index, translate)).title)
                  .join(', ')
            : formatDynamicFieldValue(field, values, translate);

    return (
        <View
            style={[styles.mhn5, styles.pv1]}
            fsClass={CONST.FULLSTORY.CLASS.MASK}
        >
            <MenuItemField
                name={getFieldLabel(field, translate)}
                value={value}
            />
        </View>
    );
}

export default ReadonlyField;
