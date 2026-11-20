/**
 * A file input. The upload control reports only the files that the user just added, so the field keeps the whole list
 * in its own state and hands it to the form as the value.
 */
import InputWrapper from '@components/Form/InputWrapper';
import Text from '@components/Text';
import UploadFile from '@components/UploadFile';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import type {FileFieldConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import type {OnboardingFormID} from '@pages/SimplifiedBankOnboarding/formConfig/validation/types';

import {clearErrorFields, setErrorFields} from '@userActions/FormActions';

import type {FileObject} from '@src/types/utils/Attachment';

import React, {useState} from 'react';
import {View} from 'react-native';

type FileFieldProps = {
    formID: OnboardingFormID;
    field: FileFieldConfig;
};

function FileField({formID, field}: FileFieldProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const [files, setFiles] = useState<FileObject[]>(field.defaultValue);

    const changeFiles = (newFiles: FileObject[]) => {
        setFiles(newFiles);
    };

    // The upload control checks the size, the type and the count of the files, and its error replaces the error of the field
    const setUploadError = (error: string) => {
        if (!error) {
            clearErrorFields(formID);
            return;
        }
        setErrorFields(formID, {[field.id]: {onUpload: error}});
    };

    return (
        <View>
            <Text style={[styles.textNormalThemeText, styles.textLineHeightNormal, styles.textStrong, styles.mb3]}>{field.label}</Text>
            <InputWrapper
                InputComponent={UploadFile}
                inputID={field.id}
                buttonText={translate('common.chooseFile')}
                uploadedFiles={files}
                value={files}
                onUpload={(addedFiles) => changeFiles([...files, ...addedFiles])}
                onRemove={(fileName) => changeFiles(files.filter((file) => file.name !== fileName))}
                setError={setUploadError}
                acceptedFileTypes={field.acceptedFileTypes}
                fileLimit={field.fileLimit}
                maxFileSize={field.maxFileSize}
            />
            {!!field.description && <Text style={[styles.mutedTextLabel, styles.mt3]}>{field.description}</Text>}
        </View>
    );
}

export default FileField;
