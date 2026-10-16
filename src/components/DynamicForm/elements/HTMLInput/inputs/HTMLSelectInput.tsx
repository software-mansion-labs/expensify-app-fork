import type HTMLInputProps from '@components/DynamicForm/elements/HTMLInput/types';
import InputWrapper from '@components/Form/InputWrapper';
import ValuePicker from '@components/ValuePicker';

import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

/** One of the allowed values, picked from a list */
function HTMLSelectInput({element, onRefreshRequirements}: HTMLInputProps) {
    const styles = useThemeStyles();

    return (
        <View
            style={[styles.mhn5, styles.pv1]}
            fsClass={CONST.FULLSTORY.CLASS.MASK}
        >
            <InputWrapper
                InputComponent={ValuePicker}
                inputID={element.key}
                shouldSaveDraft
                forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}
                label={element.name}
                items={(element.valuesAllowed ?? []).map((value) => ({value: value.key, label: value.name}))}
                onValueChange={element.refreshRequirementsOnChange ? (value, key) => onRefreshRequirements?.(key, value) : undefined}
            />
        </View>
    );
}

export default HTMLSelectInput;
