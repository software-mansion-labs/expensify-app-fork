import type HTMLInputProps from '@components/DynamicForm/elements/HTMLInput/types';
import InputWrapper from '@components/Form/InputWrapper';
import TextInput from '@components/TextInput';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import getTextInputAutocorrectProps from '@libs/getTextInputAutocorrectProps';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

/** Typed text. A field that refreshes the requirements does so when the user leaves it, since the answer changes on every keystroke. */
function HTMLTextInput({element, values, onRefreshRequirements}: HTMLInputProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    const refreshRequirements = () => {
        const value = values[element.key];
        if (value !== undefined) {
            onRefreshRequirements?.(element.key, value);
        }
    };

    return (
        <View
            style={styles.pv2}
            fsClass={CONST.FULLSTORY.CLASS.MASK}
        >
            <InputWrapper
                InputComponent={TextInput}
                inputID={element.key}
                shouldSaveDraft
                forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}
                label={element.name}
                hint={element.example ? translate('dynamicForm.exampleHint', {example: element.example}) : undefined}
                maxLength={element.maxLength ?? undefined}
                onBlur={element.refreshRequirementsOnChange ? refreshRequirements : undefined}
                {...getTextInputAutocorrectProps()}
            />
        </View>
    );
}

export default HTMLTextInput;
