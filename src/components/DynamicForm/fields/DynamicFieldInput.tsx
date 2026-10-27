import type {DynamicFormFieldOfType} from '@components/DynamicForm/types';
import getSensitiveDefaultValue from '@components/DynamicForm/utils/getSensitiveDefaultValue';

import type {DynamicFormFieldType} from '@src/types/onyx';

import type {ComponentType} from 'react';

import React from 'react';

import type {DynamicFieldInputProps, DynamicFieldProps} from './types';

import AddressField from './AddressField';
import AmountField from './AmountField';
import BooleanField from './choices/BooleanField';
import CountryField from './choices/CountryField';
import CurrencyField from './choices/CurrencyField';
import MultiChoiceField from './choices/MultiChoiceField';
import RadioField from './choices/RadioField';
import SelectField from './choices/SelectField';
import DateField from './DateField';
import {useDynamicFieldContext} from './DynamicFieldContext';
import FileField from './FileField';
import ListField from './ListField';
import NumberField from './NumberField';
import PercentField from './PercentField';
import TextField from './TextField';

/** One component per field type, so typecheck fails when a type has none */
const FIELD_COMPONENTS: {[TType in DynamicFormFieldType]: ComponentType<DynamicFieldProps<TType>>} = {
    text: TextField,
    number: NumberField,
    date: DateField,
    amount: AmountField,
    percent: PercentField,
    select: SelectField,
    radio: RadioField,
    multiselect: MultiChoiceField,
    countryMultiselect: MultiChoiceField,
    country: CountryField,
    currency: CurrencyField,
    boolean: BooleanField,
    address: AddressField,
    file: FileField,
    list: ListField,
};

type DynamicFieldInputComponentProps<TType extends DynamicFormFieldType> = {
    field: DynamicFormFieldOfType<TType>;
    inputProps: DynamicFieldInputProps;
};

/** The input of one field, laid out for its type */
function DynamicFieldInput<TType extends DynamicFormFieldType>({field, inputProps}: DynamicFieldInputComponentProps<TType>) {
    const {values, isSensitive} = useDynamicFieldContext();
    const FieldComponent: ComponentType<DynamicFieldProps<TType>> = FIELD_COMPONENTS[field.type];

    return (
        <FieldComponent
            field={field}
            inputProps={{...inputProps, defaultValue: getSensitiveDefaultValue(field, values, isSensitive)}}
        />
    );
}

export default DynamicFieldInput;
