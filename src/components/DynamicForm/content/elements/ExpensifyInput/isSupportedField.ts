import {logSchemaProblem} from '@components/DynamicForm/shared';

import type {DynamicFormField, DynamicFormFieldType, DynamicFormSchemaField} from '@src/types/onyx';

const SUPPORTED_FIELD_TYPES: Record<DynamicFormFieldType, true> = {
    text: true,
    number: true,
    select: true,
    radio: true,
    date: true,
    boolean: true,
    country: true,
    currency: true,
    address: true,
    multiselect: true,
    countryMultiselect: true,
    file: true,
    amount: true,
    percent: true,
    list: true,
};

/** Whether this App version knows the field type. An unknown one is reported once. */
function isSupportedFieldType(type: string, key: string | undefined): boolean {
    if (Object.hasOwn(SUPPORTED_FIELD_TYPES, type)) {
        return true;
    }
    logSchemaProblem('Unknown field type', {type, key: key ?? ''});
    return false;
}

/** A field of a type this App version does not know, or with no key to store its answer under, is left out, so it neither renders nor blocks submission */
function isSupportedField(field: DynamicFormSchemaField): field is DynamicFormField {
    if (!field.key) {
        logSchemaProblem('Field without a key', {type: field.type});
        return false;
    }
    return isSupportedFieldType(field.type, field.key);
}

export default isSupportedField;
export {isSupportedFieldType};
