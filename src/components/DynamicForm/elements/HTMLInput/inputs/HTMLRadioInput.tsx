import type HTMLInputProps from '@components/DynamicForm/elements/HTMLInput/types';
import InputWrapper from '@components/Form/InputWrapper';
import RadioButtons from '@components/RadioButtons';
import Text from '@components/Text';

import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

/** One of the allowed values, each shown as a radio button under the field's name */
function HTMLRadioInput({element, onRefreshRequirements}: HTMLInputProps) {
    const styles = useThemeStyles();

    return (
        <View
            style={[styles.mhn5, styles.pv1]}
            fsClass={CONST.FULLSTORY.CLASS.MASK}
        >
            <Text style={[styles.mt3, styles.ph5]}>{element.name}</Text>
            <InputWrapper
                InputComponent={RadioButtons}
                inputID={element.key}
                shouldSaveDraft
                forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}
                items={(element.valuesAllowed ?? []).map((value) => ({value: value.key, label: value.name}))}
                accessibilityLabel={element.name}
                onValueChange={element.refreshRequirementsOnChange ? (value, key) => onRefreshRequirements?.(key, value) : undefined}
            />
        </View>
    );
}

export default HTMLRadioInput;
