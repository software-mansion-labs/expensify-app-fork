import DynamicFieldInput from '@components/DynamicForm/fields/DynamicFieldInput';
import ReadonlyField from '@components/DynamicForm/fields/ReadonlyField';
import type {DynamicFieldSharedProps} from '@components/DynamicForm/fields/types';
import isSensitiveField from '@components/DynamicForm/utils/isSensitiveField';

import CONST from '@src/CONST';
import type {DynamicFormField, DynamicFormFieldType} from '@src/types/onyx';

import React from 'react';

import type {DynamicFormFieldsProps} from './DynamicFormFields';

type DynamicFormFieldRowProps = Omit<DynamicFieldSharedProps, 'shouldHideLabel'> &
    Pick<DynamicFormFieldsProps, 'onRefreshRequirements'> & {
        field: DynamicFormField;

        /** The page title already says what the field asks, so its label is not drawn above the input. Inputs keep their own accessibility name. */
        shouldHideLabel?: boolean;
    };

/** Typed answers change on every keystroke, so they ask for new requirements when the user leaves the input instead */
const TYPED_FIELD_TYPES = new Set<DynamicFormFieldType>(['text', 'number', 'amount', 'percent']);

/** One field of a schema-driven form: its input, or its value when the field is readonly */
function DynamicFormFieldRow({
    field,
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
}: DynamicFormFieldRowProps) {
    if (field.readonly) {
        return (
            <ReadonlyField
                field={field}
                values={values}
            />
        );
    }

    const refreshRequirements = () => {
        const value = values[field.key];
        if (value !== undefined) {
            onRefreshRequirements?.(field.key, value);
        }
    };

    const isTypedField = TYPED_FIELD_TYPES.has(field.type);
    const shouldRefreshOnBlur = !!field.refreshOnChange && isTypedField;
    const shouldRefreshOnChange = !!field.refreshOnChange && !isTypedField;

    return (
        <DynamicFieldInput
            field={field}
            values={values}
            currency={currency}
            maxFileSize={maxFileSize}
            isLoneField={isLoneField}
            shouldHideLabel={shouldHideLabel}
            onOpenListItemEditor={onOpenListItemEditor}
            onListItemsChange={onListItemsChange}
            isSensitive={isSensitive}
            renderFields={renderFields}
            inputProps={{
                inputID: field.key,
                shouldSaveDraft: !isSensitive && !isSensitiveField(field),
                forwardedFSClass: CONST.FULLSTORY.CLASS.MASK,
                onValueChange: shouldRefreshOnChange ? (value, key) => onRefreshRequirements?.(key, value) : undefined,
                onBlur: shouldRefreshOnBlur ? refreshRequirements : undefined,
            }}
        />
    );
}

export default DynamicFormFieldRow;
