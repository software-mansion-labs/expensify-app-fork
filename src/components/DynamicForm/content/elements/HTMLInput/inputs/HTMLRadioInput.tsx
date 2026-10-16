import getHTMLInputChoices from '@components/DynamicForm/content/elements/HTMLInput/getHTMLInputChoices';
import type {HTMLInputOfTypeProps} from '@components/DynamicForm/content/elements/HTMLInput/types';
import DynamicFormInputRow from '@components/DynamicForm/content/elements/shared/DynamicFormInputRow';
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
