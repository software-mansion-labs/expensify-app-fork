import type {DynamicFormError} from '@components/DynamicForm/types';

import {addErrorMessage} from '@libs/ErrorUtils';

/** Errors in the shape FormProvider's `validate` returns. Messages for the same input are joined, one per line. */
function toFormErrors(errors: DynamicFormError[]): Record<string, string> {
    const formErrors: Record<string, string> = {};
    for (const [inputID, message] of errors) {
        addErrorMessage(formErrors, inputID, message);
    }
    return formErrors;
}

export default toFormErrors;
