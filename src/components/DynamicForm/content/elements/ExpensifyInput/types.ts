import type {DynamicFormInputOptions, DynamicFormListActions, DynamicFormRenderFields, DynamicFormValues} from '@components/DynamicForm/types';

import type {DynamicFormExpensifyInputElement} from '@src/types/onyx';

type ExpensifyInputProps = Omit<DynamicFormInputOptions, 'currency'> &
    Required<Pick<DynamicFormInputOptions, 'currency'>> &
    DynamicFormListActions & {
        element: DynamicFormExpensifyInputElement;

        /** Current answers, so showWhen and dependsOn follow the user's typing */
        values: DynamicFormValues;

        /** The field is the page's only question, so a choice is drawn as the page itself instead of as a row */
        isLoneField: boolean;

        /** The page title already says what the field asks, so its label is not drawn above the input. Inputs keep their own accessibility name. */
        shouldHideLabel?: boolean;

        /** Every answer here is sensitive, as in the editor of an entry of a sensitive list: none is drafted, and each starts from the answer in `values` */
        isSensitive?: boolean;

        renderFields: DynamicFormRenderFields;
    };

// eslint-disable-next-line import/prefer-default-export
export type {ExpensifyInputProps};
