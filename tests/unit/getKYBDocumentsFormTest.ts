import getKYBDocumentsForm, {getKYBDocumentsParams} from '@pages/ReimbursementAccount/USD/KYBDocuments/getKYBDocumentsForm';

import INPUT_IDS from '@src/types/form/ReimbursementAccountForm';

const KEYS = INPUT_IDS.KYB_DOCUMENTS;

describe('getKYBDocumentsForm', () => {
    it('asks only for the documents the verification could not confirm', () => {
        // Given a verification that failed on the tax ID and on the user's date of birth
        const requiredDocumentKeys = [KEYS.COMPANY_TAX_ID, KEYS.USER_DOB_VERIFICATION];

        // When the form is built for it
        const [page] = getKYBDocumentsForm(requiredDocumentKeys).pages;

        // Then the page asks for those two files only, so the user is not asked for documents that are already verified
        expect(page.content.map((field) => [field.key, field.type, field.required])).toEqual([
            [KEYS.COMPANY_TAX_ID, 'file', true],
            [KEYS.USER_DOB_VERIFICATION, 'file', true],
        ]);
    });

    it('sends the first file of each document under the name the upload command takes', () => {
        // Given a tax ID answered with two files and a date of birth document left unanswered
        const taxIDFile = {name: 'ein.pdf', uri: 'file://ein.pdf'};
        const answers = {[KEYS.COMPANY_TAX_ID]: [taxIDFile, {name: 'extra.pdf', uri: 'file://extra.pdf'}]};

        // When the answers are turned into API params
        const params = getKYBDocumentsParams(answers);

        // Then the command gets one file under its own name for the tax ID, which the form drafts under a different key, and nothing for the unanswered document
        expect(params).toEqual({companyTaxID: taxIDFile});
    });
});
