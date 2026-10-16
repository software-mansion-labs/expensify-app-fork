import type {DynamicFormListItem} from '@src/types/onyx';

function isListItem(value: unknown): value is DynamicFormListItem {
    return typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'string';
}

export default isListItem;
