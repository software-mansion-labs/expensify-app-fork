/**
 * The USD documents step as plan config. The server asks for documents only when its automatic checks fail, so the
 * plan holds this step only while the account lists required documents.
 */
import getCorpayFileField from '@pages/SimplifiedBankOnboarding/formConfig/fields/getCorpayFileField';
import type {FileFieldConfig, StepConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import isFormPageComplete from '@pages/SimplifiedBankOnboarding/formConfig/validation/isFormPageComplete';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import getRequestKey from '@pages/SimplifiedBankOnboarding/requests/requestKey';
import uploadKYBDocuments from '@pages/SimplifiedBankOnboarding/requests/usd/uploadKYBDocuments';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import type {KYBDocumentType} from '@pages/SimplifiedBankOnboarding/types/onyx';

import type USDStepInput from './types';

import hasPassedServerStep from './hasPassedServerStep';

function getDocumentField(documentType: KYBDocumentType, {answers, translate}: USDStepInput): FileFieldConfig {
    if (documentType === SBO_CONST.USD.KYB_DOCUMENT_TYPES.COMPANY_TAX_ID) {
        return getCorpayFileField(
            INPUT_IDS.COMPANY_TAX_ID_DOCUMENT,
            translate('documentsStep.taxIDVerification'),
            translate('documentsStep.taxIDVerificationDescription'),
            answers.companyTaxIDDocument,
        );
    }
    return getCorpayFileField(
        INPUT_IDS.COMPANY_ADDRESS_DOCUMENT,
        translate('documentsStep.companyAddressVerification'),
        translate('documentsStep.companyAddressVerificationDescription'),
        answers.companyAddressDocument,
    );
}

/** The documents that the automatic checks could not verify. The plan only holds the step while the server asks for some. */
function getKYBDocumentsStep(input: USDStepInput, requiredDocuments: KYBDocumentType[]): StepConfig {
    const {achData, bankAccount, translate} = input;
    const fields = requiredDocuments.map((documentType) => getDocumentField(documentType, input));

    return {
        id: SBO_CONST.USD.PAGE_NAMES.KYB_DOCS,
        title: translate('documentsStep.subheader'),
        isComplete: hasPassedServerStep(achData, SBO_CONST.USD.STEP.KYB_DOCS),
        pages: [
            {
                kind: 'form',
                id: SBO_CONST.USD.KYB_DOCUMENTS_SUB_PAGES.UPLOAD,
                isComplete: isFormPageComplete(fields, translate),
                title: translate('documentsStep.beforeYouGo'),
                description: translate('documentsStep.verificationFailed'),
                fields,
                submitLabel: translate('common.verify'),
            },
        ],
        submit: () => {
            const documentNames = fields.map((field) => field.defaultValue.at(0)?.name ?? '').filter((documentName) => !!documentName);
            return uploadKYBDocuments(bankAccount, documentNames);
        },
        requestKey: getRequestKey(REQUEST_NAMES.UPLOAD_KYB_DOCUMENTS, bankAccount),
    };
}

export default getKYBDocumentsStep;
