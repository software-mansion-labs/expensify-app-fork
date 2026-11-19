import InputWrapper from '@components/Form/InputWrapper';
import PushRowWithModal from '@components/PushRowWithModal';

import useThemeStyles from '@hooks/useThemeStyles';

import type {PicklistFieldConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';

import React from 'react';
import {View} from 'react-native';

type PicklistFieldProps = {
    field: PicklistFieldConfig;
    shouldSaveDraft: boolean;
};

function PicklistField({field, shouldSaveDraft}: PicklistFieldProps) {
    const styles = useThemeStyles();
    const optionsList = Object.fromEntries(field.options.map((option) => [option.value, option.label]));

    // The row draws its own horizontal padding, so it cancels the margin of the form to line up with the other fields
    return (
        <View style={styles.mhn5}>
            <InputWrapper
                InputComponent={PushRowWithModal}
                inputID={field.id}
                optionsList={optionsList}
                description={field.label}
                modalHeaderTitle={field.label}
                searchInputTitle={field.label}
                defaultValue={field.defaultValue}
                shouldSaveDraft={shouldSaveDraft}
                shouldAllowChange={!field.isLocked}
            />
        </View>
    );
}

export default PicklistField;
