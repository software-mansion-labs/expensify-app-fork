import DynamicFormInputRow from '@components/DynamicForm/content/elements/DynamicFormInputRow';
import {getRefreshHandlers} from '@components/DynamicForm/content/elements/inputBehavior';
import {getLocalizedText} from '@components/DynamicForm/shared';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';
import type {DynamicFormFieldType} from '@src/types/onyx';

import React from 'react';

import type {ExpensifyInputProps} from './types';

import getFieldLabel from './model/getFieldLabel';
import isSensitiveField from './model/isSensitiveField';
import ReadonlyFieldRow from './ReadonlyFieldRow';
import renderDynamicField from './renderDynamicField';

/** Typed answers change on every keystroke, so they ask for new requirements when the user leaves the input instead */
const TYPED_FIELD_TYPES = new Set<DynamicFormFieldType>(['text', 'number', 'amount', 'percent']);

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
            <ReadonlyFieldRow
                field={field}
                values={values}
            />
        );
    }

    const {input, isMenuRow, labelAbove, showsDescription} = renderDynamicField(
        field,
        {values, translate, styles, currency, maxFileSize, isLoneField, onOpenListItemEditor, onListItemsChange, isSensitive, renderFields},
        {
            inputID: field.key,
            shouldSaveDraft: !isSensitive && !isSensitiveField(field),
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
