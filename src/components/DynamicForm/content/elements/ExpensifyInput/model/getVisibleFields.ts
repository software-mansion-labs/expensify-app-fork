import {isShown} from '@components/DynamicForm/shared';
import type {DynamicFormValues} from '@components/DynamicForm/types';

import type {DynamicFormField} from '@src/types/onyx';

/** The fields the user sees right now, which are also the only ones validated. `allFields` is the whole form when `fields` is one page of it, since a controlling field can sit on another page. */
function getVisibleFields(fields: DynamicFormField[], values: DynamicFormValues, allFields = fields): DynamicFormField[] {
    return fields.filter((field) => isShown(field.showWhen, values, allFields));
}

export default getVisibleFields;
