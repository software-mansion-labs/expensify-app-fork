/**
 * A text input of a form page. The confirmation of the step shows its value under its label.
 */
import InputWrapper from '@components/Form/InputWrapper';
import TextInput from '@components/TextInput';

import useThemeStyles from '@hooks/useThemeStyles';

import type {TextInputID} from '@pages/SimplifiedBankOnboarding/contract/form';

import CONST from '@src/CONST';

import type {ValueOf} from 'type-fest';

import React from 'react';
import {View} from 'react-native';

import type {Field, InputRule} from './types';

import getInputErrors from './getInputErrors';

type TextInputOptions = {
    label: string;
    inputMode?: ValueOf<typeof CONST.INPUT_MODE>;
    maxLength?: number;
    placeholder?: string;
    hint?: string;

    /** The server accepted the value and no longer takes a new one, so the page shows the value and does not submit it */
    isLocked?: boolean;

    /** The value is hidden in session recordings, such as an account number */
    isSensitive?: boolean;
};

type TextFieldOptions = TextInputOptions &
    InputRule & {
        /** The label of the confirmation row. Defaults to the label of the input. */
        summaryLabel?: string;

        /** How the confirmation row shows the value, such as a share with its percent sign */
        formatSummaryValue?: (value: string) => string;
    };

type TextFieldInputProps = TextInputOptions & {
    inputID: TextInputID;
    defaultValue: string;
};

function TextFieldInput({inputID, label, defaultValue, inputMode, maxLength, placeholder, hint, isLocked, isSensitive}: TextFieldInputProps) {
    const styles = useThemeStyles();

    return (
        <View style={styles.mb6}>
            <InputWrapper
                InputComponent={TextInput}
                inputID={inputID}
                label={label}
                aria-label={label}
                role={CONST.ROLE.PRESENTATION}
                defaultValue={defaultValue}
                inputMode={inputMode}
                maxLength={maxLength}
                placeholder={placeholder}
                hint={hint}
                shouldUseDefaultValue={isLocked}
                disabled={isLocked}
                forwardedFSClass={isSensitive ? CONST.FULLSTORY.CLASS.MASK : undefined}
                sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.EDIT_INPUT}
            />
        </View>
    );
}

function createTextField(inputID: TextInputID, options: TextFieldOptions): Field {
    const {isOptional, requiredErrorText, validate, summaryLabel, formatSummaryValue, label, inputMode, maxLength, placeholder, hint, isLocked, isSensitive} = options;

    return {
        key: inputID,
        inputIDs: [inputID],
        getErrors: (values, translate) => getInputErrors(inputID, {isOptional, requiredErrorText, validate}, values, translate),
        isHeldByServer: isLocked,

        getSummaryRows: (values) => {
            const value = values[inputID] ?? '';
            return [{id: inputID, label: summaryLabel ?? label, value: formatSummaryValue ? formatSummaryValue(value) : value}];
        },

        render: ({values}) => (
            <TextFieldInput
                inputID={inputID}
                label={label}
                defaultValue={values[inputID] ?? ''}
                inputMode={inputMode}
                maxLength={maxLength}
                placeholder={placeholder}
                hint={hint}
                isLocked={isLocked}
                isSensitive={isSensitive}
            />
        ),
    };
}

export default createTextField;
