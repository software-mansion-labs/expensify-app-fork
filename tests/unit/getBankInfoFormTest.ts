import getBankInfoForm, {getBankInfoParams, getBankInfoPrefill, getBankInfoRuleErrors} from '@pages/ReimbursementAccount/NonUSD/BankInfo/getBankInfoForm';

import type {CorpayFields, CorpayFormField} from '@src/types/onyx';
import type {ACHDataReimbursementAccount} from '@src/types/onyx/ReimbursementAccount';

function buildField(id: string, overrides: Partial<CorpayFormField> = {}): CorpayFormField {
    return {id, label: id, isRequired: true, isRequiredInValueSet: false, errorMessage: '', regEx: '', validationRules: [], ...overrides};
}

const FORM_FIELDS = [
    buildField('swiftBicCode', {validationRules: [{regEx: '^[A-Z]{8}$', errorMessage: 'SWIFT must be 8 capital letters'}]}),
    buildField('BeneficiaryAccountType', {valueSet: [{id: '1', code: 'checking', text: 'CHECKING'}]}),
    buildField('accountHolderName'),
    buildField('accountHolderCountry'),
];

describe('getBankInfoForm', () => {
    it('builds a page of bank details and a page of account holder details from the Corpay fields', () => {
        // Given Corpay fields for the bank and for the account holder
        // When the schema is built from them
        const [bankPage, accountHolderPage] = getBankInfoForm(FORM_FIELDS).pages;

        // Then the account holder's fields get their own page, so the URLs of the old sub pages still open the same fields
        expect(bankPage?.content.map((field) => field.key)).toEqual(['swiftBicCode', 'BeneficiaryAccountType']);
        expect(accountHolderPage?.content.map((field) => field.key)).toEqual(['accountHolderName', 'accountHolderCountry']);
        // Then a field with a value set is picked from it and the account holder's country from every country
        expect(bankPage?.content.at(1)).toMatchObject({type: 'select', values: [{key: 'checking', label: 'Checking'}]});
        expect(accountHolderPage?.content.at(1)).toMatchObject({type: 'country'});
    });

    it("checks Corpay's format rules with Corpay's own message", () => {
        // Given the bank details page and a SWIFT code that breaks Corpay's rule
        const [bankPage] = getBankInfoForm(FORM_FIELDS).pages;

        // When the page is checked
        const errors = bankPage ? getBankInfoRuleErrors(FORM_FIELDS, bankPage, {swiftBicCode: 'abc', BeneficiaryAccountType: 'checking'}) : {};

        // Then the error is Corpay's message, since it says what format the bank expects
        expect(errors).toEqual({swiftBicCode: 'SWIFT must be 8 capital letters'});
    });

    it('prefills from the keys the server saves the answers under and sends them back with the Corpay account details', () => {
        // Given a bank account that saved the SWIFT code as its routing number and the account holder name as the address name
        const achData: Partial<ACHDataReimbursementAccount> = {routingNumber: 'ABCDEFGH', addressName: 'Alberta Charleson'};
        const corpayFields: CorpayFields = {
            bankCountry: 'GB',
            bankCurrency: 'GBP',
            classification: 'Business',
            destinationCountry: 'GB',
            paymentMethods: ['E'],
            preferredMethod: 'E',
            formFields: FORM_FIELDS,
            isLoading: false,
            isSuccess: true,
        };

        // When its answers prefill the form and the form's answers become API params
        const prefill = getBankInfoPrefill(FORM_FIELDS, achData, 'GB');
        const params = getBankInfoParams(prefill, corpayFields);

        // Then each answer is back under its field's key, the account holder's country starts as the bank's, and Corpay's account details go along
        expect(params).toEqual({
            swiftBicCode: 'ABCDEFGH',
            BeneficiaryAccountType: undefined,
            accountHolderName: 'Alberta Charleson',
            accountHolderCountry: 'GB',
            bankCountry: 'GB',
            bankCurrency: 'GBP',
            classification: 'Business',
            destinationCountry: 'GB',
            paymentMethods: ['E'],
            preferredMethod: 'E',
        });
    });
});
