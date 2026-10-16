import {getVisibleInputs} from '@components/DynamicForm/content/getVisibleContent';
import {isFieldVisible} from '@components/DynamicForm/shared/getVisibleFields';
import type {DynamicFormValues} from '@components/DynamicForm/types';

import type {DynamicFormField, DynamicFormPage} from '@src/types/onyx';

/** A page is shown when its own `showWhen` matches and it has an input to show. A page that is not shown is skipped, and its fields are not asked or submitted. */
function isPageShown(page: DynamicFormPage, values: DynamicFormValues, allFields: DynamicFormField[]): boolean {
    return isFieldVisible(page, values, allFields) && getVisibleInputs(page.content, values, allFields).length > 0;
}

export default isPageShown;
