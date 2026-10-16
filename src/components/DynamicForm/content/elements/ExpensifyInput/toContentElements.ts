import type {DynamicFormExpensifyInputElement, DynamicFormField} from '@src/types/onyx';

/** The fields of a list entry are App-format fields, so they become content once tagged */
function toContentElements(fields: DynamicFormField[]): DynamicFormExpensifyInputElement[] {
    return fields.map((field) => ({...field, elementType: 'ExpensifyInput'}));
}

export default toContentElements;
