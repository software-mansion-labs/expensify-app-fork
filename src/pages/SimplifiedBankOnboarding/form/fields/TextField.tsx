import InputWrapper from '@components/Form/InputWrapper';
import TextInput from '@components/TextInput';

import useThemeStyles from '@hooks/useThemeStyles';

import type {TextInputID} from '@pages/SimplifiedBankOnboarding/types/form';

import CONST from '@src/CONST';

import type {ValueOf} from 'type-fest';

import React from 'react';
import {View} from 'react-native';

type TextFieldProps = {
    inputID: TextInputID;
    label: string;
    defaultValue: string;
    inputMode?: ValueOf<typeof CONST.INPUT_MODE>;
    maxLength?: number;
    placeholder?: string;
    hint?: string;

    /** The server accepted the value and no longer takes a new one */
    isLocked?: boolean;
};

function TextField({inputID, label, defaultValue, inputMode, maxLength, placeholder, hint, isLocked}: TextFieldProps) {
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
                sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.EDIT_INPUT}
            />
        </View>
    );
}

export default TextField;
export type {TextFieldProps};
