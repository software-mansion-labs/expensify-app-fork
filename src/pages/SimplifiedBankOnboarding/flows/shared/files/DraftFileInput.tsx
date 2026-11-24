/**
 * A file input of the onboarding flows. It keeps the picked files and saves each change to the draft, so a reload keeps
 * them and a later step can send a file that an earlier step collected. An upload error shows on the input.
 */
import InputWrapper from '@components/Form/InputWrapper';
import type {FormRef} from '@components/Form/types';
import UploadFile from '@components/UploadFile';

import useLocalize from '@hooks/useLocalize';

import type {FileInputID, OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import {useOnboardingFlow} from '@pages/SimplifiedBankOnboarding/core';

import {clearErrorFields, clearErrors, setErrorFields} from '@userActions/FormActions';

import CONST from '@src/CONST';
import type {FileObject} from '@src/types/utils/Attachment';

import type {RefObject} from 'react';

import React, {useState} from 'react';

type DraftFileInputProps = {
    inputID: FileInputID;

    /** The files shown when the input mounts */
    defaultFiles: FileObject[];
    fileLimit: number;
    maxFileSize?: number;

    /** The form that holds the input. When given, an upload error replaces the validation errors of the form. */
    formRef?: RefObject<FormRef | null>;
};

function DraftFileInput({inputID, defaultFiles, fileLimit, maxFileSize, formRef}: DraftFileInputProps) {
    const {translate} = useLocalize();
    const {formID, saveDraft} = useOnboardingFlow();
    const [files, setFiles] = useState(defaultFiles);

    const saveFiles = (newFiles: FileObject[]) => {
        const draftUpdate: OnboardingDraft = {};
        draftUpdate[inputID] = newFiles;
        saveDraft(draftUpdate);
        setFiles(newFiles);
    };

    const setUploadError = (error: string) => {
        if (!error) {
            clearErrorFields(formID);
            return;
        }
        if (formRef) {
            formRef.current?.resetFormFieldError(inputID);
            clearErrors(formID);
        }
        setErrorFields(formID, {[inputID]: {onUpload: error}});
    };

    return (
        <InputWrapper
            InputComponent={UploadFile}
            buttonText={translate('common.chooseFile')}
            uploadedFiles={files}
            onUpload={(addedFiles) => saveFiles([...files, ...addedFiles])}
            onRemove={(fileName) => saveFiles(files.filter((file) => file.name !== fileName))}
            acceptedFileTypes={[...CONST.CORPAY_DOCUMENT.ALLOWED_FILE_TYPES]}
            value={files}
            inputID={inputID}
            setError={setUploadError}
            fileLimit={fileLimit}
            maxFileSize={maxFileSize}
        />
    );
}

export default DraftFileInput;
export type {DraftFileInputProps};
