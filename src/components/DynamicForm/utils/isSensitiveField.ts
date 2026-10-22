import type {DynamicFormField} from '@src/types/onyx';

/** A sensitive answer stays out of the form draft, and the flow keeps it in memory instead */
function isSensitiveField(field: DynamicFormField): boolean {
    return !!field.sensitive;
}

/** The field is sensitive, or is a list whose entries hold a sensitive answer at any depth, so its answer must stay out of the draft */
function hasSensitiveAnswer(field: DynamicFormField): boolean {
    return isSensitiveField(field) || (field.type === 'list' && field.itemFields.some(hasSensitiveAnswer));
}

export default isSensitiveField;
export {hasSensitiveAnswer};
