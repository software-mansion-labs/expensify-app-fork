import type {DynamicFormInputOptions, DynamicFormListActions, DynamicFormValues} from '@components/DynamicForm/types';

import type {DynamicFormExpensifyInputElement, DynamicFormField, DynamicFormFieldType} from '@src/types/onyx';

import type {ReactNode} from 'react';

/** The variant of one type. An intersection rather than Extract, since one variant can cover several types, such as select and radio. */
type DynamicFormFieldOfType<TType extends DynamicFormFieldType> = DynamicFormField & {type: TType};

/** Draws the fields of a list entry inside the modal editor used outside DynamicFormFlow. `isSensitive` keeps every answer out of the draft. */
type DynamicFormRenderFields = (fields: DynamicFormField[], values: DynamicFormValues, isSensitive: boolean) => ReactNode;

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

export type {DynamicFormFieldOfType, DynamicFormRenderFields, ExpensifyInputProps};
