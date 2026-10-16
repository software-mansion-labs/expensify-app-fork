import {getVisibleInputs} from '@components/DynamicForm/content/getVisibleContent';
import type {DynamicFormFlowPage} from '@components/DynamicForm/flow/types';
import {isShown} from '@components/DynamicForm/shared';
import type {DynamicFormValues} from '@components/DynamicForm/types';

import type {DynamicFormField} from '@src/types/onyx';

/** A page is shown when its own `showWhen` matches and it has an input to show. A page that is not shown is skipped, and its fields are not asked or submitted. */
function isPageShown(page: DynamicFormFlowPage, values: DynamicFormValues, allFields: DynamicFormField[]): boolean {
    return isShown(page.showWhen, values, allFields) && getVisibleInputs(page.content, values, allFields).length > 0;
}

export default isPageShown;
