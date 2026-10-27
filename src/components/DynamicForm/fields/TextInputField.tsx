import getLocalizedText, {getInputLabel} from '@components/DynamicForm/utils/getLocalizedText';
import InputWrapper from '@components/Form/InputWrapper';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';
import TextInput from '@components/TextInput';

import useLocalize from '@hooks/useLocalize';

import getTextInputAutocorrectProps from '@libs/getTextInputAutocorrectProps';

import type {DynamicFormNumberField, DynamicFormTextField} from '@src/types/onyx';

import type {InputModeOptions} from 'react-native';

import React from 'react';

import type {DynamicFieldInputProps} from './types';

import FieldRow from './FieldRow';

type TextInputFieldProps = {
    field: DynamicFormTextField | DynamicFormNumberField;
    inputProps: DynamicFieldInputProps<string>;
    inputMode: InputModeOptions | undefined;
    isMultiline?: boolean;
};

function getTextHint(field: DynamicFormTextField | DynamicFormNumberField, translate: LocalizedTranslate): string | undefined {
    const description = getLocalizedText(translate, field.descriptionKey, field.description);
    if (description || !field.example) {
        return description;
    }
    return translate('dynamicForm.exampleHint', {example: field.example});
}

/** A typed answer in a text input, which shows the field description as its hint */
function TextInputField({field, inputProps, inputMode, isMultiline = false}: TextInputFieldProps) {
    const {translate} = useLocalize();

    return (
        <FieldRow isDescriptionInInput>
            <InputWrapper
                InputComponent={TextInput}
                {...inputProps}
                label={getInputLabel(field, translate)}
                hint={getTextHint(field, translate)}
                maxLength={field.maxLength}
                inputMode={inputMode}
                multiline={isMultiline}
                autoGrowHeight={isMultiline}
                {...(isMultiline ? {} : getTextInputAutocorrectProps())}
            />
        </FieldRow>
    );
}

export default TextInputField;
