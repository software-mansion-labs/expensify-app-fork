import DynamicFormInputRow from '@components/DynamicForm/components/DynamicFormInputRow';
import getHTMLInputChoices from '@components/DynamicForm/elements/HTMLInput/getHTMLInputChoices';
import type {HTMLInputOfTypeProps} from '@components/DynamicForm/elements/HTMLInput/types';
import InputWrapper from '@components/Form/InputWrapper';
import ValuePicker from '@components/ValuePicker';

import React from 'react';

/** One of the allowed values, picked from a list */
function HTMLSelectInput({element, inputProps}: HTMLInputOfTypeProps) {
    return (
        <DynamicFormInputRow isMenuRow>
            <InputWrapper
                InputComponent={ValuePicker}
                {...inputProps}
                label={element.name}
                items={getHTMLInputChoices(element)}
            />
        </DynamicFormInputRow>
    );
}

export default HTMLSelectInput;
