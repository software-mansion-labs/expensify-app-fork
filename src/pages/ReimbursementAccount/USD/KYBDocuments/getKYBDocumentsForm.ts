/**
 * The "KYB documents" step of the USD bank account setup as a DynamicForm schema: one page that asks for a file per document the verification could not confirm.
 * Field keys are the draft keys of the bank account form, and each answer is sent under the name the upload command takes.
 */
import type {DynamicFormValues} from '@components/DynamicForm/types';
import getFirstFile from '@components/DynamicForm/utils/getFirstFile';

import type {UploadUserKYBDocsParams} from '@libs/API/parameters';

import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';
import INPUT_IDS from '@src/types/form/ReimbursementAccountForm';
import type {DynamicFormSchema} from '@src/types/onyx';

type KYBDocumentFiles = Omit<UploadUserKYBDocsParams, 'bankAccountID'>;

type KYBDocument = {
    key: string;
    apiParam: keyof KYBDocumentFiles;
    labelKey: TranslationPaths;
    descriptionKey: TranslationPaths;
};

const KEYS = INPUT_IDS.KYB_DOCUMENTS;

/** The tax ID document has its own draft key, so it does not collide with the tax ID number the business info step drafts */
const KYB_DOCUMENTS: KYBDocument[] = [
    {key: KEYS.COMPANY_TAX_ID, apiParam: 'companyTaxID', labelKey: 'documentsStep.taxIDVerification', descriptionKey: 'documentsStep.taxIDVerificationDescription'},
    {key: KEYS.NAME_CHANGE_DOCUMENT, apiParam: 'nameChangeDocument', labelKey: 'documentsStep.nameChangeDocument', descriptionKey: 'documentsStep.nameChangeDocumentDescription'},
    {
        key: KEYS.COMPANY_ADDRESS_VERIFICATION,
        apiParam: 'companyAddressVerification',
        labelKey: 'documentsStep.companyAddressVerification',
        descriptionKey: 'documentsStep.companyAddressVerificationDescription',
    },
    {
        key: KEYS.USER_ADDRESS_VERIFICATION,
        apiParam: 'userAddressVerification',
        labelKey: 'documentsStep.userAddressVerification',
        descriptionKey: 'documentsStep.userAddressVerificationDescription',
    },
    {key: KEYS.USER_DOB_VERIFICATION, apiParam: 'userDOBVerification', labelKey: 'documentsStep.userDOBVerification', descriptionKey: 'documentsStep.userDOBVerificationDescription'},
];

/** A form asking for the documents in `requiredDocumentKeys`, as `getRequiredKYBDocuments` lists them */
function getKYBDocumentsForm(requiredDocumentKeys: readonly string[]) {
    return {
        pages: [
            {
                key: CONST.BANK_ACCOUNT.KYB_DOCUMENTS_STEP.SUB_PAGE_NAMES.UPLOAD_DOCUMENTS,
                titleKey: 'documentsStep.beforeYouGo',
                descriptionKey: 'documentsStep.verificationFailed',
                content: KYB_DOCUMENTS.filter((document) => requiredDocumentKeys.includes(document.key)).map(({key, labelKey, descriptionKey}) => ({
                    key,
                    type: 'file',
                    required: true,
                    labelKey,
                    descriptionKey,
                })),
            },
        ],
    } satisfies DynamicFormSchema;
}

/** The first file of each answered document, under the name the upload command takes it */
function getKYBDocumentsParams(answers: DynamicFormValues): KYBDocumentFiles {
    const params: KYBDocumentFiles = {};
    for (const {key, apiParam} of KYB_DOCUMENTS) {
        const file = getFirstFile(answers[key]);
        if (file) {
            params[apiParam] = file;
        }
    }
    return params;
}

export default getKYBDocumentsForm;
export {getKYBDocumentsParams};
