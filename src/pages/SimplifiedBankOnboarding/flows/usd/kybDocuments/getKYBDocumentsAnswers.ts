/**
 * The documents that the USD verification asks for, each with the files that the user picked for it. Only the draft
 * holds files, the server keeps their names only.
 */
import type {FlowData} from '@pages/SimplifiedBankOnboarding/core';

import type {FileObject} from '@src/types/utils/Attachment';

import type {KYBDocument} from './getRequiredKYBDocuments';

import getRequiredKYBDocuments from './getRequiredKYBDocuments';

type KYBDocumentAnswer = KYBDocument & {files: FileObject[]};

function getKYBDocumentsAnswers({draft, account}: FlowData): KYBDocumentAnswer[] {
    return getRequiredKYBDocuments(account?.achData?.requiredKYBDocuments ?? []).map((document) => ({...document, files: draft[document.inputID] ?? []}));
}

export default getKYBDocumentsAnswers;
