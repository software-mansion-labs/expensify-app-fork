import DatePicker from '@components/DatePicker';
import type HTMLInputProps from '@components/DynamicForm/elements/HTMLInput/types';
import InputWrapper from '@components/Form/InputWrapper';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

/** A calendar date, stored as yyyy-MM-dd */
function HTMLDateInput({element, onRefreshRequirements}: HTMLInputProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    return (
        <View
            style={styles.pv2}
            fsClass={CONST.FULLSTORY.CLASS.MASK}
        >
            <InputWrapper
                InputComponent={DatePicker}
                inputID={element.key}
                shouldSaveDraft
                forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}
                label={element.name}
                placeholder={translate('common.dateFormat')}
                onValueChange={element.refreshRequirementsOnChange ? (value, key) => onRefreshRequirements?.(key, value) : undefined}
            />
        </View>
    );
}

export default HTMLDateInput;
