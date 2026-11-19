/**
 * The document step of the USD flow, shown only when the verification asks for documents. Like the real step it renders
 * one file input per required document, keeps the picked files both in local state and in the form draft, and has no step
 * counter in the header. The mock request carries only the file names. The submit follows its request by its own ID.
 */
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';
import FormHelpMessage from '@components/FormHelpMessage';
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';
import Text from '@components/Text';
import UploadFile from '@components/UploadFile';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {uploadKYBDocuments} from '@pages/SimplifiedBankOnboarding/actions/USDBankAccount';
import useStepRequest from '@pages/SimplifiedBankOnboarding/requests/useStepRequest';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import {getBankAccountParams} from '@pages/SimplifiedBankOnboarding/utils/OnboardingAccountUtils';

import {clearErrorFields, setDraftValues, setErrorFields} from '@userActions/FormActions';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {FileObject} from '@src/types/utils/Attachment';

import React, {useState} from 'react';
import {View} from 'react-native';

import type USDPageProps from './types';

type KYBDocumentsProps = Pick<USDPageProps, 'onSubmit' | 'onBackButtonPress'>;

type KYBInputID = typeof INPUT_IDS.COMPANY_TAX_ID_DOCUMENT | typeof INPUT_IDS.COMPANY_ADDRESS_DOCUMENT;

type UploadedFiles = Record<KYBInputID, FileObject[]>;

const DOCUMENTS_CONFIG = [
    {
        inputID: INPUT_IDS.COMPANY_TAX_ID_DOCUMENT,
        documentType: SBO_CONST.USD.KYB_DOCUMENT_TYPES.COMPANY_TAX_ID,
        title: 'documentsStep.taxIDVerification',
        description: 'documentsStep.taxIDVerificationDescription',
    },
    {
        inputID: INPUT_IDS.COMPANY_ADDRESS_DOCUMENT,
        documentType: SBO_CONST.USD.KYB_DOCUMENT_TYPES.COMPANY_ADDRESS,
        title: 'documentsStep.companyAddressVerification',
        description: 'documentsStep.companyAddressVerificationDescription',
    },
] as const;

function KYBDocuments({onSubmit, onBackButtonPress}: KYBDocumentsProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);
    const {send, isPending, errorMessage} = useStepRequest({onSuccess: onSubmit});

    const [uploadedFiles, setUploadedFiles] = useState<UploadedFiles>(() => ({
        [INPUT_IDS.COMPANY_TAX_ID_DOCUMENT]: draft?.[INPUT_IDS.COMPANY_TAX_ID_DOCUMENT] ?? [],
        [INPUT_IDS.COMPANY_ADDRESS_DOCUMENT]: draft?.[INPUT_IDS.COMPANY_ADDRESS_DOCUMENT] ?? [],
    }));

    const achData = account?.achData;
    const requiredDocumentTypes = achData?.requiredKYBDocuments ?? [];
    const requiredDocuments = DOCUMENTS_CONFIG.filter((document) => requiredDocumentTypes.includes(document.documentType));

    const updateFiles = (inputID: KYBInputID, files: FileObject[]) => {
        setUploadedFiles((previousFiles) => ({...previousFiles, [inputID]: files}));
        setDraftValues(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM, {[inputID]: files});
    };

    const setUploadError = (error: string, inputID: KYBInputID) => {
        if (!error) {
            clearErrorFields(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM);
            return;
        }
        setErrorFields(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM, {[inputID]: {onUpload: error}});
    };

    const validate = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM>): FormInputErrors<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM> => {
        const errors: FormInputErrors<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM> = {};
        for (const document of requiredDocuments) {
            if (!values[document.inputID]?.length) {
                errors[document.inputID] = translate('common.error.fieldRequired');
            }
        }
        return errors;
    };

    const submit = () => {
        const documentNames = requiredDocuments.map((document) => uploadedFiles[document.inputID].at(0)?.name ?? '').filter((documentName) => !!documentName);
        send((requestID) => uploadKYBDocuments(requestID, getBankAccountParams(achData?.policyID, achData), documentNames));
    };

    return (
        <InteractiveStepWrapper
            wrapperID="SimplifiedBankOnboardingKYBDocuments"
            shouldEnablePickerAvoiding={false}
            shouldEnableMaxHeight
            headerTitle={translate('documentsStep.subheader')}
            handleBackButtonPress={onBackButtonPress}
        >
            <FormProvider
                formID={ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM}
                submitButtonText={translate('common.verify')}
                onSubmit={submit}
                validate={validate}
                style={[styles.mh5, styles.flexGrow1]}
                submitButtonStyles={styles.mb0}
                enabledWhenOffline={false}
                isLoading={isPending}
            >
                <Text style={[styles.textHeadlineLineHeightXXL, styles.mb5]}>{translate('documentsStep.beforeYouGo')}</Text>
                <Text style={[styles.textSupporting, styles.mb5]}>{translate('documentsStep.verificationFailed')}</Text>
                {requiredDocuments.map((document, index) => (
                    <View key={document.inputID}>
                        <Text style={[styles.textNormalThemeText, styles.textLineHeightNormal, styles.textStrong, styles.mb3]}>{translate(document.title)}</Text>
                        <InputWrapper
                            InputComponent={UploadFile}
                            buttonText={translate('common.chooseFile')}
                            uploadedFiles={uploadedFiles[document.inputID]}
                            onUpload={(files) => updateFiles(document.inputID, [...uploadedFiles[document.inputID], ...files])}
                            onRemove={(fileName) =>
                                updateFiles(
                                    document.inputID,
                                    uploadedFiles[document.inputID].filter((file) => file.name !== fileName),
                                )
                            }
                            setError={(error) => setUploadError(error, document.inputID)}
                            fileLimit={CONST.CORPAY_DOCUMENT.FILE_LIMIT}
                            acceptedFileTypes={[...CONST.CORPAY_DOCUMENT.ALLOWED_FILE_TYPES]}
                            value={uploadedFiles[document.inputID]}
                            inputID={document.inputID}
                        />
                        <Text style={[styles.mutedTextLabel, styles.mt3]}>{translate(document.description)}</Text>
                        {requiredDocuments.length > index + 1 && <View style={[styles.sectionDividerLine, styles.mv6]} />}
                    </View>
                ))}
                <FormHelpMessage
                    style={styles.mt3}
                    message={errorMessage}
                />
            </FormProvider>
        </InteractiveStepWrapper>
    );
}

export default KYBDocuments;
