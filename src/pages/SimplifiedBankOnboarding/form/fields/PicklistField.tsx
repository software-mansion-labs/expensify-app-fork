import InputWrapper from '@components/Form/InputWrapper';
import PushRowWithModal from '@components/PushRowWithModal';

import useThemeStyles from '@hooks/useThemeStyles';

import type {TextInputID} from '@pages/SimplifiedBankOnboarding/types/form';

import React from 'react';
import {View} from 'react-native';

type PicklistOption = {
    value: string;
    label: string;
};

type PicklistFieldProps = {
    inputID: TextInputID;
    label: string;
    defaultValue: string;
    options: PicklistOption[];
    isLocked?: boolean;

    /** The title of the list that opens from the row. Defaults to the label. */
    modalTitle?: string;

    /** The label of the search input of that list. Defaults to the label. */
    searchTitle?: string;
};

function PicklistField({inputID, label, defaultValue, options, isLocked, modalTitle, searchTitle}: PicklistFieldProps) {
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

export default PicklistField;
export type {PicklistOption};
