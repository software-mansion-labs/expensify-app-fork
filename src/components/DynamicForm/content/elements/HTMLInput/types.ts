import type {RefreshHandlers} from '@components/DynamicForm/content/elements/shared/getRefreshHandlers';
import type {DynamicFormInputOptions, DynamicFormValues} from '@components/DynamicForm/types';
import type {InputComponentBaseProps} from '@components/Form/types';

import type {ForwardedFSClassProps} from '@libs/Fullstory/types';

import type {DynamicFormHTMLInputElement} from '@src/types/onyx';

type HTMLInputProps = Pick<DynamicFormInputOptions, 'onRefreshRequirements'> & {
    element: DynamicFormHTMLInputElement;

    /** Current answers, which a typed answer reads when the user leaves the input */
    values: DynamicFormValues;
};

/** Props every HTML input passes to its InputWrapper */
type HTMLInputWrapperProps = Required<Pick<InputComponentBaseProps, 'inputID' | 'shouldSaveDraft'>> & Required<ForwardedFSClassProps> & RefreshHandlers;

/** Props of the input one `type` names */
type HTMLInputOfTypeProps = {
    element: DynamicFormHTMLInputElement;

    inputProps: HTMLInputWrapperProps;
};

export type {HTMLInputOfTypeProps, HTMLInputProps, HTMLInputWrapperProps};
