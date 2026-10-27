import FileUploadAdapter from '@components/DynamicForm/adapters/FileUploadAdapter';
import {getInputLabel} from '@components/DynamicForm/utils/getLocalizedText';
import InputWrapper from '@components/Form/InputWrapper';

import useLocalize from '@hooks/useLocalize';

import CONST from '@src/CONST';

import React from 'react';

import type {DynamicFieldProps} from './types';

import {useDynamicFieldContext} from './DynamicFieldContext';
import FieldRow from './FieldRow';

/** Uploaded documents, one file unless the schema allows more */
function FileField({field, inputProps}: DynamicFieldProps<'file'>) {
    const {translate} = useLocalize();
    const {maxFileSize} = useDynamicFieldContext();
    const fileLimit = field.maxFiles ?? CONST.DYNAMIC_FORM_DOCUMENT.FILE_LIMIT;
    const buttonText = translate(fileLimit > 1 ? 'common.chooseFiles' : 'common.chooseFile');

    return (
        <FieldRow labelAbove="heading">
            <InputWrapper
                InputComponent={FileUploadAdapter}
                {...inputProps}
                valueType="files"
                buttonText={buttonText}
                accessibilityLabel={`${buttonText}, ${getInputLabel(field, translate)}`}
                fileLimit={fileLimit}
                acceptedFileTypes={[...CONST.DYNAMIC_FORM_DOCUMENT.ALLOWED_FILE_TYPES]}
                maxFileSize={field.maxFileSize ?? maxFileSize}
            />
        </FieldRow>
    );
}

export default FileField;
