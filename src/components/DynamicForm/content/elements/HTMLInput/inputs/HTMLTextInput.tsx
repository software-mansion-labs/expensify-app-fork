import type {HTMLInputOfTypeProps} from '@components/DynamicForm/content/elements/HTMLInput/types';
import DynamicFormInputRow from '@components/DynamicForm/content/elements/shared/DynamicFormInputRow';
import InputWrapper from '@components/Form/InputWrapper';
import TextInput from '@components/TextInput';

import useLocalize from '@hooks/useLocalize';

import getTextInputAutocorrectProps from '@libs/getTextInputAutocorrectProps';

import React from 'react';

/** Typed text, with Wise's example as a hint */
function HTMLTextInput({element, inputProps}: HTMLInputOfTypeProps) {
    const {translate} = useLocalize();

    return (
        <DynamicFormInputRow>
            <InputWrapper
                InputComponent={TextInput}
                {...inputProps}
                label={element.name}
                hint={element.example ? translate('dynamicForm.exampleHint', {example: element.example}) : undefined}
                maxLength={element.maxLength ?? undefined}
                {...getTextInputAutocorrectProps()}
            />
        </DynamicFormInputRow>
    );
}

export default HTMLTextInput;
