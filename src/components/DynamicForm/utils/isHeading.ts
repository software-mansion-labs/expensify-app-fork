import type {DynamicFormField, DynamicFormHeading} from '@src/types/onyx';

/** A page and a Heading element have no `type`, which tells them apart from a field when a `showWhen` chain is followed */
function isHeading(item: DynamicFormHeading | DynamicFormField): item is DynamicFormHeading {
    return !('type' in item);
}

export default isHeading;
