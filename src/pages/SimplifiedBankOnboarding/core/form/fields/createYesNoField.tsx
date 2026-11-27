/**
 * A yes or no question saved to one boolean input, where "No" is an answer too. The page shows the question as its
 * title, so the field only names it for screen readers. The confirmation of a step does not show it.
 */
import YesNoAdapter from '@components/DynamicForm/adapters/YesNoAdapter';
import InputWrapper from '@components/Form/InputWrapper';

import useThemeStyles from '@hooks/useThemeStyles';

import type {BooleanInputID} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {OnboardingFormErrors} from '@pages/SimplifiedBankOnboarding/contract/formID';

import React from 'react';
import {View} from 'react-native';

import type {Field} from './types';

type YesNoFieldOptions = {
    /** Read by screen readers as the name of the two choices */
    question: string;

    /** The choice that the question opens with. Defaults to the saved answer, and to "No" without one. */
    defaultValue?: boolean;
};

type YesNoFieldInputProps = {
    inputID: BooleanInputID;
    question: string;
    defaultValue: boolean;
};

function YesNoFieldInput({inputID, question, defaultValue}: YesNoFieldInputProps) {
    const styles = useThemeStyles();

    // The choices draw their own horizontal padding, so the field cancels the margin of the form to line up with the other fields
    return (
        <View style={[styles.mhn5, styles.mb6]}>
            <InputWrapper
                InputComponent={YesNoAdapter}
                inputID={inputID}
                accessibilityLabel={question}
                defaultValue={defaultValue}
            />
        </View>
    );
}

function createYesNoField(inputID: BooleanInputID, {question, defaultValue}: YesNoFieldOptions): Field {
    return {
        key: inputID,
        inputIDs: [inputID],

        // The required check of the other fields counts `false` as empty, and here "No" is a valid answer
        getErrors: (values, translate) => {
            const errors: OnboardingFormErrors = {};
            if (typeof values[inputID] !== 'boolean') {
                errors[inputID] = translate('common.error.fieldRequired');
            }
            return errors;
        },

        render: ({values}) => (
            <YesNoFieldInput
                inputID={inputID}
                question={question}
                defaultValue={defaultValue ?? values[inputID] ?? false}
            />
        ),
    };
}

export default createYesNoField;
