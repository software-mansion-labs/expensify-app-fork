/**
 * A required document with the limits of the global provider: one file of the accepted types and size. The upload
 * control reports only the files that the user just added, so the field keeps the whole list in its own state and hands
 * it to the form as the value.
 */
import InputWrapper from '@components/Form/InputWrapper';
import Text from '@components/Text';
import UploadFile from '@components/UploadFile';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import type {FileInputID} from '@pages/SimplifiedBankOnboarding/types/form';

import {clearErrorFields, setErrorFields} from '@userActions/FormActions';

import CONST from '@src/CONST';
import type {FileObject} from '@src/types/utils/Attachment';

import type {ReactNode} from 'react';

import React, {useContext, useState} from 'react';
import {View} from 'react-native';

import OnboardingFormIDContext from './OnboardingFormIDContext';

type FileFieldProps = {
    inputID: FileInputID;
    label: string;
    defaultValue: FileObject[];

    /** Shown under the file button, such as a `FileFieldDescription` of what the document must show */
    children?: ReactNode;
};

function FileField({inputID, label, defaultValue, children}: FileFieldProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const formID = useContext(OnboardingFormIDContext);
    const [files, setFiles] = useState<FileObject[]>(defaultValue);

    const changeFiles = (newFiles: FileObject[]) => {
        setFiles(newFiles);
    };

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
                onUpload={(addedFiles) => changeFiles([...files, ...addedFiles])}
                onRemove={(fileName) => changeFiles(files.filter((file) => file.name !== fileName))}
                setError={setUploadError}
                acceptedFileTypes={[...CONST.CORPAY_DOCUMENT.ALLOWED_FILE_TYPES]}
                fileLimit={CONST.CORPAY_DOCUMENT.FILE_LIMIT}
                maxFileSize={CONST.CORPAY_DOCUMENT.MAX_FILE_SIZE}
            />
            {children}
        </View>
    );
}

export default FileField;
