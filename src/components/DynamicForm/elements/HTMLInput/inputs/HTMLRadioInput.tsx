import DynamicFormInputRow from '@components/DynamicForm/components/DynamicFormInputRow';
import getHTMLInputChoices from '@components/DynamicForm/elements/HTMLInput/getHTMLInputChoices';
import type {HTMLInputOfTypeProps} from '@components/DynamicForm/elements/HTMLInput/types';
import InputWrapper from '@components/Form/InputWrapper';
import RadioButtons from '@components/RadioButtons';
import Text from '@components/Text';

import useThemeStyles from '@hooks/useThemeStyles';

import React from 'react';

/** One of the allowed values, each shown as a radio button under the field's name */
function HTMLRadioInput({element, inputProps}: HTMLInputOfTypeProps) {
    const styles = useThemeStyles();

    return (
        <DynamicFormInputRow isMenuRow>
            <Text style={[styles.mt3, styles.ph5]}>{element.name}</Text>
            <InputWrapper
                InputComponent={RadioButtons}
                {...inputProps}
                items={getHTMLInputChoices(element)}
                accessibilityLabel={element.name}
            />
        </DynamicFormInputRow>
    );
}

export default HTMLRadioInput;
