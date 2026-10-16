import CONST from '@src/CONST';
import type {DynamicFormField} from '@src/types/onyx';

const OWN_PAGE_TYPES = new Set<DynamicFormField['type']>(['address', 'file', 'multiselect', 'countryMultiselect', 'list']);

/** Fields that need room get a page of their own: addresses, files, multi-selects, lists, and selects that are dependent or large */
function needsOwnPage(field: DynamicFormField): boolean {
    if (OWN_PAGE_TYPES.has(field.type)) {
        return true;
    }
    if (field.type !== 'select') {
        return false;
    }
    return !!field.dependsOn || (field.values?.length ?? 0) > CONST.DYNAMIC_FORM.LARGE_SELECT_MIN_OPTIONS;
}

export default needsOwnPage;
