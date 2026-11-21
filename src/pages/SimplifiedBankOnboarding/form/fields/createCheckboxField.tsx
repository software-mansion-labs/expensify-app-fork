/**
 * A checkbox that the user must tick, such as an agreement. The confirmation of a step does not show it.
 */
import CheckboxWithLabel from '@components/CheckboxWithLabel';
import InputWrapper from '@components/Form/InputWrapper';

import useThemeStyles from '@hooks/useThemeStyles';

import type {BooleanInputID} from '@pages/SimplifiedBankOnboarding/types/form';

import React from 'react';
import {View} from 'react-native';

import type {Field} from './types';

import getInputErrors from './getInputErrors';

type CheckboxFieldOptions = {
    label: string;

    /** The error of a box that is not ticked. The generic "field required" error is shown without it. */
    requiredErrorText?: string;
};

type CheckboxFieldInputProps = {
    inputID: BooleanInputID;
    label: string;
    defaultValue: boolean;
};

function CheckboxFieldInput({inputID, label, defaultValue}: CheckboxFieldInputProps) {
    const styles = useThemeStyles();

    return (
        <View style={styles.mb6}>
            <InputWrapper
                InputComponent={CheckboxWithLabel}
                inputID={inputID}
                label={label}
                accessibilityLabel={label}
                defaultValue={defaultValue}
            />
        </View>
    );
}

function createCheckboxField(inputID: BooleanInputID, {label, requiredErrorText}: CheckboxFieldOptions): Field {
    return {
        key: inputID,
        inputIDs: [inputID],
        getErrors: (values, translate) => getInputErrors(inputID, {requiredErrorText}, values, translate),

        render: ({values}) => (
            <CheckboxFieldInput
                inputID={inputID}
                label={label}
                defaultValue={values[inputID] ?? false}
            />
        ),
    };
}

export default createCheckboxField;
