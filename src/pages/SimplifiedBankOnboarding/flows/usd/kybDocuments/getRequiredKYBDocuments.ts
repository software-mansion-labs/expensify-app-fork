/**
 * The company documents that the USD verification may ask for, each with its file input and its texts. The step shows
 * and the request sends the documents that the server asked for, always in this order: the tax ID, then the address.
 */
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import type {KYBDocumentType} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';

import type {TranslationPaths} from '@src/languages/types';

type KYBFileInputID = typeof INPUT_IDS.COMPANY_TAX_ID_DOCUMENT | typeof INPUT_IDS.COMPANY_ADDRESS_DOCUMENT;

type KYBDocument = {
    inputID: KYBFileInputID;
    documentType: KYBDocumentType;
    title: TranslationPaths;
    description: TranslationPaths;
};

const KYB_DOCUMENTS: KYBDocument[] = [
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
];

function getRequiredKYBDocuments(requiredDocumentTypes: KYBDocumentType[]): KYBDocument[] {
    return KYB_DOCUMENTS.filter((document) => requiredDocumentTypes.includes(document.documentType));
}

export default getRequiredKYBDocuments;
export type {KYBDocument};
