/**
 * A required document with the limits of the global provider: one file of the accepted types and size. The upload
 * control reports only the files that the user just added, so the input keeps the whole list in its own state and hands
 * it to the form as the value. The server never returns a file, so the draft keeps it after the step is saved.
 */
import InputWrapper from '@components/Form/InputWrapper';
import Text from '@components/Text';
import UploadFile from '@components/UploadFile';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import type {FileInputID} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {OnboardingFormID} from '@pages/SimplifiedBankOnboarding/contract/formID';

import {clearErrorFields, setErrorFields} from '@userActions/FormActions';

import CONST from '@src/CONST';
import type {FileObject} from '@src/types/utils/Attachment';

import React, {useState} from 'react';
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
    formID: OnboardingFormID;
    defaultValue: FileObject[];
};

function FileFieldInput({inputID, formID, label, description, defaultValue}: FileFieldInputProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const [files, setFiles] = useState<FileObject[]>(defaultValue);

    // The upload control checks the size, the type and the count of the files, and its error replaces the error of the field
    const setUploadError = (error: string) => {
        if (!error) {
            clearErrorFields(formID);
            return;
        }
        setErrorFields(formID, {[inputID]: {onUpload: error}});
    };

    return (
        <View style={styles.mb6}>
            <Text style={[styles.textNormalThemeText, styles.textLineHeightNormal, styles.textStrong, styles.mb3]}>{label}</Text>
            <InputWrapper
                InputComponent={UploadFile}
                inputID={inputID}
                buttonText={translate('common.chooseFile')}
                uploadedFiles={files}
                value={files}
                onUpload={(addedFiles) => setFiles([...files, ...addedFiles])}
                onRemove={(fileName) => setFiles(files.filter((file) => file.name !== fileName))}
                setError={setUploadError}
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

        render: ({values, formID}) => (
            <FileFieldInput
                inputID={inputID}
                formID={formID}
                label={label}
                description={description}
                defaultValue={values[inputID] ?? []}
            />
        ),
    };
}

export default createFileField;
