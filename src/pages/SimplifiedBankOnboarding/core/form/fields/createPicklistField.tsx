/**
 * A row that opens a list of options and saves the value of the picked one. The confirmation of the step shows the label
 * of that option.
 */
import InputWrapper from '@components/Form/InputWrapper';
import PushRowWithModal from '@components/PushRowWithModal';

import useThemeStyles from '@hooks/useThemeStyles';

import type {TextInputID} from '@pages/SimplifiedBankOnboarding/contract/form';

import React from 'react';
import {View} from 'react-native';

import type {Field} from './types';

import getInputErrors from './getInputErrors';

type PicklistOption = {
    value: string;
    label: string;
};

type PicklistInputOptions = {
    label: string;
    options: PicklistOption[];

    /**
     * The user cannot pick another option. The page still submits the shown option, because confirming it can be the
     * answer itself, such as the only country of a flow, and an option is never a masked value.
     */
    isLocked?: boolean;

    /** The title of the list that opens from the row. Defaults to the label. */
    modalTitle?: string;

    /** The label of the search input of that list. Defaults to the label. */
    searchTitle?: string;
};

type PicklistFieldOptions = PicklistInputOptions & {
    isOptional?: boolean;

    /** The value of a row that has no answer yet, such as the only country of a flow. Defaults to no value. */
    defaultValue?: string;
};

type PicklistFieldInputProps = PicklistInputOptions & {
    inputID: TextInputID;
    defaultValue: string;
};

function PicklistFieldInput({inputID, label, defaultValue, options, isLocked, modalTitle, searchTitle}: PicklistFieldInputProps) {
    const styles = useThemeStyles();
    const optionsList = Object.fromEntries(options.map((option) => [option.value, option.label]));

    // The row draws its own horizontal padding, so it cancels the margin of the form to line up with the other fields
    return (
        <View style={[styles.mhn5, styles.mb6]}>
            <InputWrapper
                InputComponent={PushRowWithModal}
                inputID={inputID}
                optionsList={optionsList}
                description={label}
                modalHeaderTitle={modalTitle ?? label}
                searchInputTitle={searchTitle ?? label}
                defaultValue={defaultValue}
                shouldAllowChange={!isLocked}
            />
        </View>
    );
}

function createPicklistField(inputID: TextInputID, {isOptional, defaultValue = '', label, options, isLocked, modalTitle, searchTitle}: PicklistFieldOptions): Field {
    return {
        key: inputID,
        inputIDs: [inputID],
        getErrors: (values, translate) => getInputErrors(inputID, {isOptional}, values, translate),

        getSummaryRows: (values) => {
            const value = values[inputID] ?? '';
            return [{id: inputID, label, value: options.find((option) => option.value === value)?.label ?? value}];
        },

        render: ({values}) => (
            <PicklistFieldInput
                inputID={inputID}
                label={label}
                defaultValue={values[inputID] || defaultValue}
                options={options}
                isLocked={isLocked}
                modalTitle={modalTitle}
                searchTitle={searchTitle}
            />
        ),
    };
}

export default createPicklistField;
export type {PicklistOption};
