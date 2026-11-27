/**
 * A required document with the limits of the global provider: one file of the accepted types and size. The shared
 * upload adapter keeps the whole list of files as the value of the form and shows the error of a rejected file. The
 * server never returns a file, so the draft keeps it after the step is saved.
 */
import FileUploadAdapter from '@components/DynamicForm/adapters/FileUploadAdapter';
import InputWrapper from '@components/Form/InputWrapper';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import type {FileInputID} from '@pages/SimplifiedBankOnboarding/contract/form';

import CONST from '@src/CONST';
import type {FileObject} from '@src/types/utils/Attachment';

import React from 'react';
import {View} from 'react-native';

import type {Field} from './types';

import getInputErrors from './getInputErrors';

type FileFieldOptions = {
    label: string;

    /** Shown under the file button, such as what the document must show */
    description?: string;
};

type FileFieldInputProps = FileFieldOptions & {
    inputID: FileInputID;
    defaultValue: FileObject[];
};

function FileFieldInput({inputID, label, description, defaultValue}: FileFieldInputProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const buttonText = translate('common.chooseFile');

    return (
        <View style={styles.mb6}>
            <Text style={[styles.textNormalThemeText, styles.textLineHeightNormal, styles.textStrong, styles.mb3]}>{label}</Text>
            <InputWrapper
                InputComponent={FileUploadAdapter}
                inputID={inputID}
                valueType="files"
                defaultValue={defaultValue}
                buttonText={buttonText}
                accessibilityLabel={`${buttonText}, ${label}`}
                acceptedFileTypes={[...CONST.CORPAY_DOCUMENT.ALLOWED_FILE_TYPES]}
                fileLimit={CONST.CORPAY_DOCUMENT.FILE_LIMIT}
                maxFileSize={CONST.CORPAY_DOCUMENT.MAX_FILE_SIZE}
            />
            {!!description && <Text style={[styles.mutedTextLabel, styles.mt3]}>{description}</Text>}
        </View>
    );
}

function createFileField(inputID: FileInputID, {label, description}: FileFieldOptions): Field {
    return {
        key: inputID,
        inputIDs: [inputID],
        shouldKeepInDraft: true,
        getErrors: (values, translate) => getInputErrors(inputID, {}, values, translate),

        render: ({values}) => (
            <FileFieldInput
                inputID={inputID}
                label={label}
                description={description}
                defaultValue={values[inputID] ?? []}
            />
        ),
    };
}

export default createFileField;
