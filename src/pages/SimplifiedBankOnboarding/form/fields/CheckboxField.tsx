import CheckboxWithLabel from '@components/CheckboxWithLabel';
import InputWrapper from '@components/Form/InputWrapper';

import useThemeStyles from '@hooks/useThemeStyles';

import type {BooleanInputID} from '@pages/SimplifiedBankOnboarding/types/form';

import React from 'react';
import {View} from 'react-native';

type CheckboxFieldProps = {
    inputID: BooleanInputID;
    label: string;
    defaultValue: boolean;
};

function CheckboxField({inputID, label, defaultValue}: CheckboxFieldProps) {
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

export default CheckboxField;
