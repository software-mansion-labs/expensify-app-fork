import type {DynamicFormFieldsProps} from '@components/DynamicForm/components/DynamicFormFields';
import type {DynamicFormFieldOfType, DynamicFormValues} from '@components/DynamicForm/types';
import type {FormValue, InputComponentBaseProps} from '@components/Form/types';

import type {ForwardedFSClassProps} from '@libs/Fullstory/types';

import type {DynamicFormField, DynamicFormFieldType, DynamicFormListItem} from '@src/types/onyx';
import type {FileObject} from '@src/types/utils/Attachment';

import type {ReactNode} from 'react';

/** What every field of one row shares, provided by DynamicFormFieldRow */
type DynamicFieldContextValue = Pick<DynamicFormFieldsProps, 'values' | 'maxFileSize' | 'onOpenListItemEditor' | 'onListItemsChange' | 'isSensitive'> &
    Required<Pick<DynamicFormFieldsProps, 'currency'>> & {
        /** The field the row draws, whose label and description FieldRow shows */
        field: DynamicFormField;

        /** The field is the page's only question, so a choice is drawn as the page itself instead of as a row */
        isLoneField: boolean;

        /** The page title already says what the field asks, so its label is not drawn above the input. Inputs keep their own accessibility name. */
        shouldHideLabel: boolean;

        /** Draws a list entry's fields in the modal editor used outside DynamicFormFlow */
        renderFields: (fields: DynamicFormField[], values: DynamicFormValues, isSensitive: boolean) => ReactNode;
    };

/** The answer each field type's input holds. An address holds its street, and its other parts sit under their own keys. */
type DynamicFieldAnswerMap = {
    text: string;
    number: string;
    select: string;
    radio: string;
    multiselect: string[];
    date: string;
    address: string;
    file: FileObject[];
    amount: string;
    country: string;
    countryMultiselect: string[];
    boolean: boolean;
    currency: string;
    percent: string;
    list: DynamicFormListItem[];
};

/** Props every input gets from its field */
type DynamicFieldInputProps<TAnswer extends FormValue = FormValue> = Required<ForwardedFSClassProps> &
    Required<Pick<InputComponentBaseProps, 'inputID' | 'shouldSaveDraft'>> &
    Pick<InputComponentBaseProps, 'onValueChange'> & {
        onBlur?: () => void;

        /** A sensitive answer is not drafted, so the input starts from the answer the flow keeps in memory */
        defaultValue?: TAnswer;
    };

type DynamicFieldProps<TType extends DynamicFormFieldType> = {
    field: DynamicFormFieldOfType<TType>;
    inputProps: DynamicFieldInputProps<DynamicFieldAnswerMap[TType]>;
};

export type {DynamicFieldAnswerMap, DynamicFieldContextValue, DynamicFieldInputProps, DynamicFieldProps};
