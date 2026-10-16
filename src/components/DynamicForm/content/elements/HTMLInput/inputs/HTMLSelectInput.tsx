import getHTMLInputChoices from '@components/DynamicForm/content/elements/HTMLInput/getHTMLInputChoices';
import type {HTMLInputOfTypeProps} from '@components/DynamicForm/content/elements/HTMLInput/types';
import DynamicFormInputRow from '@components/DynamicForm/content/elements/shared/DynamicFormInputRow';
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
