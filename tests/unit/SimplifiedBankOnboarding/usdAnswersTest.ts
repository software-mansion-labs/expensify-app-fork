import type {OnboardingAccount} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import getBankAccountAnswers from '@pages/SimplifiedBankOnboarding/flows/usd/bankAccount/getBankAccountAnswers';
import getOwnersAnswers from '@pages/SimplifiedBankOnboarding/flows/usd/beneficialOwners/getOwnersAnswers';
import getBusinessInfoAnswers from '@pages/SimplifiedBankOnboarding/flows/usd/businessInfo/getBusinessInfoAnswers';
import getAgreementsAnswers from '@pages/SimplifiedBankOnboarding/flows/usd/completeVerification/getAgreementsAnswers';
import getKYBDocumentsAnswers from '@pages/SimplifiedBankOnboarding/flows/usd/kybDocuments/getKYBDocumentsAnswers';
import getPersonalInfoAnswers from '@pages/SimplifiedBankOnboarding/flows/usd/personalInfo/getPersonalInfoAnswers';

import {getTestFlowData} from '../../utils/BankOnboardingLabTestUtils';

const {KYB_DOCUMENT_TYPES} = SBO_CONST.USD;

describe('the answers of the USD steps', () => {
    it('takes the draft over the server', () => {
        // Given a name that the server saved and a different one that the user typed since
        const account: OnboardingAccount = {achData: {firstName: 'Saved', companyName: 'Saved Inc'}};

        // When the answers are read
        const data = getTestFlowData({draft: {firstName: 'Typed'}, account});

        // Then the typed name wins, and a field the user did not touch shows the saved value
        expect(getPersonalInfoAnswers(data).firstName).toBe('Typed');
        expect(getBusinessInfoAnswers(data).companyName).toBe('Saved Inc');
    });

    it('keeps false in the draft over true on the server', () => {
        // Given answers that the server saved as true and the user changed to false
        const account: OnboardingAccount = {achData: {ownsMoreThan25Percent: true, isAuthorizedToUseBankAccount: true}};

        // When the answers are read
        const data = getTestFlowData({draft: {ownsMoreThan25Percent: false, isAuthorizedToUseBankAccount: false}, account});

        // Then false stays false, because a missing answer is undefined and false is an answer
        expect(getOwnersAnswers(data).ownsMoreThan25Percent).toBe(false);
        expect(getAgreementsAnswers(data).isAuthorizedToUseBankAccount).toBe(false);
    });

    it('gives empty defaults without a draft and without server data', () => {
        // Given a new setup
        // When the answers are read
        const data = getTestFlowData();

        // Then text is empty, checkboxes are unchecked, the yes or no questions have no answer yet and no document is asked for
        expect(getBankAccountAnswers(data)).toEqual({setupType: undefined, routingNumber: '', accountNumber: '', plaidAccountID: undefined});
        expect(getAgreementsAnswers(data).acceptTermsAndConditions).toBe(false);
        expect(getOwnersAnswers(data)).toEqual({ownsMoreThan25Percent: undefined, hasOtherBeneficialOwners: undefined, owners: []});
        expect(getKYBDocumentsAnswers(data)).toEqual([]);
    });

    it('reads the setup type from the draft, then from the server sub step', () => {
        // Given a server that saved a manual setup, and a server that saved none
        const manualAccount: OnboardingAccount = {achData: {subStep: SBO_CONST.SETUP_TYPE.MANUAL}};
        const emptyAccount: OnboardingAccount = {achData: {subStep: ''}};

        // When the answers are read with and without a picked option in the draft
        // Then the picked option wins, the saved one follows, and an empty sub step means no setup type
        expect(getBankAccountAnswers(getTestFlowData({draft: {setupType: SBO_CONST.SETUP_TYPE.PLAID}, account: manualAccount})).setupType).toBe(SBO_CONST.SETUP_TYPE.PLAID);
        expect(getBankAccountAnswers(getTestFlowData({account: manualAccount})).setupType).toBe(SBO_CONST.SETUP_TYPE.MANUAL);
        expect(getBankAccountAnswers(getTestFlowData({account: emptyAccount})).setupType).toBeUndefined();
    });

    it('reads the owners that the server saved while the draft has no list', () => {
        // Given a saved owners step with one other owner
        const account: OnboardingAccount = {
            achData: {ownsMoreThan25Percent: false, beneficialOwners: [{firstName: 'Grace', lastName: 'Hopper', dob: '1906-12-09'}], beneficialOwnerKeys: ['owner-a']},
        };

        // When the answers are read
        const answers = getOwnersAnswers(getTestFlowData({account}));

        // Then the saved owner is in the list with its saved ID, and the saved step answers that someone else owns 25%
        expect(answers.owners).toEqual([{id: 'owner-a', firstName: 'Grace', lastName: 'Hopper', dob: '1906-12-09'}]);
        expect(answers.hasOtherBeneficialOwners).toBe(true);
    });

    it('answers no other owner when the saved owners step saved none', () => {
        // Given a saved owners step without other owners
        const account: OnboardingAccount = {achData: {ownsMoreThan25Percent: true, beneficialOwners: []}};

        // When the answers are read
        const answers = getOwnersAnswers(getTestFlowData({account}));

        // Then the question has the answer no, so the owners step can resume past it
        expect(answers.hasOtherBeneficialOwners).toBe(false);
    });

    it('takes the owner list of the draft over the saved owners', () => {
        // Given saved owners and a list that the user edited in the draft
        const account: OnboardingAccount = {achData: {ownsMoreThan25Percent: false, beneficialOwners: [{firstName: 'Grace', lastName: 'Hopper', dob: '1906-12-09'}]}};

        // When the answers are read with an empty list in the draft
        const answers = getOwnersAnswers(getTestFlowData({draft: {usdOwners: []}, account}));

        // Then the empty list wins, because the user removed the saved owner
        expect(answers.owners).toEqual([]);
    });

    it('gives each document that the server asked for the files that the draft holds for it', () => {
        // Given a verification that asks for both documents, and a picked file for the tax ID only
        const account: OnboardingAccount = {achData: {requiredKYBDocuments: [KYB_DOCUMENT_TYPES.COMPANY_ADDRESS, KYB_DOCUMENT_TYPES.COMPANY_TAX_ID]}};
        const taxIDFile = {name: 'tax.pdf'};

        // When the answers are read
        const documents = getKYBDocumentsAnswers(getTestFlowData({draft: {companyTaxIDDocument: [taxIDFile]}, account}));

        // Then the documents come in the order of the step, the tax ID first, each with its own files
        expect(documents.map((document) => [document.inputID, document.files])).toEqual([
            ['companyTaxIDDocument', [taxIDFile]],
            ['companyAddressDocument', []],
        ]);
    });
});
