/**
 * A file input of the NonUSD flow. The picked files live in the state of the step and in the form draft, so a later step
 * can send a file that an earlier step collected.
 */

import InputWrapper from '@components/Form/InputWrapper';
import type {FormRef} from '@components/Form/types';
import UploadFile from '@components/UploadFile';

import useLocalize from '@hooks/useLocalize';

import type INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

import {clearErrorFields, clearErrors, setDraftValues, setErrorFields} from '@userActions/FormActions';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {FileObject} from '@src/types/utils/Attachment';

import type {RefObject} from 'react';

import React from 'react';

type DraftFileInputID = typeof INPUT_IDS.BANK_STATEMENT | typeof INPUT_IDS.ACH_AUTHORIZATION_FORM;

type DraftFileInputProps = {
    inputID: DraftFileInputID;
    files: FileObject[];

    /** Receives the new list after the user adds or removes a file */
    onFilesChange: (files: FileObject[]) => void;

    /** The form that holds the input, so an upload error can replace the validation error of the field */
    formRef: RefObject<FormRef | null>;
};

const FILE_LIMIT = 1;

function DraftFileInput({inputID, files, onFilesChange, formRef}: DraftFileInputProps) {
    const {translate} = useLocalize();

    const saveFiles = (newFiles: FileObject[]) => {
        setDraftValues(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM, {[inputID]: newFiles});
        onFilesChange(newFiles);
    };

    const setUploadError = (error: string) => {
        if (!error) {
            clearErrorFields(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM);
            return;
        }
        formRef.current?.resetFormFieldError(inputID);
        clearErrors(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM);
        setErrorFields(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM, {[inputID]: {onUpload: error}});
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
            fileLimit={FILE_LIMIT}
            maxFileSize={CONST.CORPAY_DOCUMENT.MAX_FILE_SIZE}
        />
    );
}

export default DraftFileInput;
