import DynamicFormInputRow from '@components/DynamicForm/content/elements/DynamicFormInputRow';
import {getRefreshHandlers} from '@components/DynamicForm/content/elements/inputBehavior';
import {getLocalizedText} from '@components/DynamicForm/shared';
import type {DynamicFormValues} from '@components/DynamicForm/types';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';
import MenuItemField from '@components/MenuItem/presets/MenuItemField';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';
import type {DynamicFormField, DynamicFormFieldType} from '@src/types/onyx';

import React from 'react';

import type {ExpensifyInputProps} from './types';

import {formatDynamicFieldValue, getFieldLabel} from './field';
import {getListItemFallbackTitle, getListItems, summarizeListItem} from './list';
import renderDynamicField from './renderers';

/** Typed answers change on every keystroke, so they ask for new requirements when the user leaves the input instead */
const TYPED_FIELD_TYPES = new Set<DynamicFormFieldType>(['text', 'number', 'amount', 'percent']);

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

/** A field in the App's own format: the rich input its type names, or its answer when the field is readonly */
function ExpensifyInput({
    element: field,
    values,
    currency,
    maxFileSize,
    isLoneField,
    shouldHideLabel = false,
    onRefreshRequirements,
    onOpenListItemEditor,
    onListItemsChange,
    isSensitive = false,
    renderFields,
}: ExpensifyInputProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    if (field.readonly) {
        return (
            <DynamicFormInputRow isMenuRow>
                <MenuItemField
                    name={getFieldLabel(field, translate)}
                    value={formatReadonlyValue(field, values, translate)}
                />
            </DynamicFormInputRow>
        );
    }

    const {input, isMenuRow, labelAbove, showsDescription} = renderDynamicField(
        field,
        {values, translate, styles, currency, maxFileSize, isLoneField, onOpenListItemEditor, onListItemsChange, isSensitive, renderFields},
        {
            inputID: field.key,
            shouldSaveDraft: !isSensitive && !field.sensitive,
            forwardedFSClass: CONST.FULLSTORY.CLASS.MASK,
            ...getRefreshHandlers({inputID: field.key, shouldRefresh: !!field.refreshOnChange, isTyped: TYPED_FIELD_TYPES.has(field.type), values, onRefreshRequirements}),
        },
    );
    const description = showsDescription ? undefined : getLocalizedText(translate, field.descriptionKey, field.description);

    return (
        <DynamicFormInputRow isMenuRow={isMenuRow}>
            {!!labelAbove && !shouldHideLabel && (
                <Text
                    style={[labelAbove === 'prompt' ? styles.mt3 : [styles.textStrong, styles.mb3], isMenuRow && styles.ph5]}
                    role={labelAbove === 'heading' ? CONST.ROLE.HEADING : undefined}
                >
                    {getFieldLabel(field, translate)}
                </Text>
            )}
            {!!description && <Text style={[styles.textSupporting, styles.mb3, isMenuRow && styles.ph5]}>{description}</Text>}
            {input}
        </DynamicFormInputRow>
    );
}

export default ExpensifyInput;
