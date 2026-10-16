import type {DynamicFormFieldsProps} from '@components/DynamicForm/components/DynamicFormFields';
import type {DynamicFormValues} from '@components/DynamicForm/types';

import type {DynamicFormHTMLInputElement} from '@src/types/onyx';

type HTMLInputProps = Pick<DynamicFormFieldsProps, 'onRefreshRequirements'> & {
    element: DynamicFormHTMLInputElement;

    /** Current answers, which a typed answer reads when the user leaves the input */
    values: DynamicFormValues;
};

export default HTMLInputProps;
