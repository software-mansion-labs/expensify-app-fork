import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import type {BankFormField} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import {
    areBankFieldsAnswered,
    areBankFieldsLoaded,
    getBankFieldDisplayValue,
    getBankFieldRuleError,
    isBankFieldAnswered,
    splitBankFields,
} from '@pages/SimplifiedBankOnboarding/flows/nonUSD/bankInfo/bankFields';

const IBAN: BankFormField = {
    id: INPUT_IDS.IBAN,
    label: 'IBAN',
    isRequired: true,
    validationRules: [
        {regEx: '^DE', errorMessage: 'Starts with DE'},
        {regEx: '^.{22}$', errorMessage: 'Has 22 characters'},
    ],
};
const SWIFT: BankFormField = {
    id: INPUT_IDS.SWIFT_BIC_CODE,
    label: 'SWIFT',
    isRequired: false,
    validationRules: [{regEx: '^[A-Z0-9]{8,11}$', errorMessage: 'Has 8 to 11 characters'}],
};
const HOLDER_NAME: BankFormField = {
    id: INPUT_IDS.ACCOUNT_HOLDER_NAME,
    label: 'Name',
    isRequired: true,
    validationRules: [],
};
const HOLDER_COUNTRY: BankFormField = {
    id: INPUT_IDS.ACCOUNT_HOLDER_COUNTRY,
    label: 'Country',
    isRequired: true,
    validationRules: [],
    valueSet: [{id: 'DE', text: 'Germany'}],
};

const VALID_IBAN = 'DE89370400440532013000';

describe('bankFields', () => {
    it('puts the account holder inputs on their own page and keeps the order of the server', () => {
        // Given the inputs in the order that the server described them, holder inputs mixed with bank inputs
        const formFields = [IBAN, HOLDER_NAME, SWIFT, HOLDER_COUNTRY];

        // When they are split between the two input pages
        const {bankAccountFields, accountHolderFields} = splitBankFields(formFields);

        // Then only the ID prefix decides the page, because the server sends no page of its own
        expect(bankAccountFields).toEqual([IBAN, SWIFT]);
        expect(accountHolderFields).toEqual([HOLDER_NAME, HOLDER_COUNTRY]);
    });

    it('returns the message of the first rule that a value breaks', () => {
        // Given an input with two rules
        // When values that break both rules, only the second one, and none are checked
        // Then the user sees one message at a time, in the order of the rules
        expect(getBankFieldRuleError(IBAN, 'FR12')).toBe('Starts with DE');
        expect(getBankFieldRuleError(IBAN, 'DE12')).toBe('Has 22 characters');
        expect(getBankFieldRuleError(IBAN, VALID_IBAN)).toBeUndefined();
    });

    it('counts an empty optional input as answered, and an empty required or invalid one as not answered', () => {
        // Given an optional input and a required one
        // When each is checked empty, and the optional one with a value that breaks its rule
        // Then the resume skips a page whose only gap is an optional input (BC-13), but not one with an invalid value
        expect(isBankFieldAnswered(SWIFT, '')).toBe(true);
        expect(isBankFieldAnswered(SWIFT, 'ab')).toBe(false);
        expect(isBankFieldAnswered(IBAN, '')).toBe(false);
        expect(isBankFieldAnswered(IBAN, VALID_IBAN)).toBe(true);
    });

    it('answers a page only when every input on it is answered', () => {
        // Given the bank inputs with a valid IBAN and no SWIFT code
        const values = {
            iban: VALID_IBAN,
            swiftBicCode: '',
            bsbNumber: '',
            accountNumber: '',
            bankName: '',
            accountHolderName: '',
            accountHolderCountry: '',
            accountHolderRegion: '',
        };

        // When the bank page and the holder page are checked
        // Then the bank page counts as answered and the holder page, with its empty required name, does not
        expect(areBankFieldsAnswered([IBAN, SWIFT], values)).toBe(true);
        expect(areBankFieldsAnswered([HOLDER_NAME, HOLDER_COUNTRY], values)).toBe(false);
    });

    it('treats the key as loaded only for the country and the currency of the account', () => {
        // Given the inputs of Germany in euros, which every workspace shares in one key
        const bankFields = {
            bankCountry: 'DE',
            bankCurrency: 'EUR',
            formFields: [IBAN],
        };

        // When the key is checked for the same account, another country, another currency, and no country
        // Then only the same account may use the inputs, so another account reads its own
        expect(areBankFieldsLoaded(bankFields, 'DE', 'EUR')).toBe(true);
        expect(areBankFieldsLoaded(bankFields, 'FR', 'EUR')).toBe(false);
        expect(areBankFieldsLoaded(bankFields, 'DE', 'AUD')).toBe(false);
        expect(areBankFieldsLoaded({...bankFields, bankCountry: ''}, '', 'EUR')).toBe(false);
        expect(areBankFieldsLoaded({bankCountry: 'DE', bankCurrency: 'EUR'}, 'DE', 'EUR')).toBe(false);
    });

    it('shows the text of a picklist option and the value of a plain input', () => {
        // Given a picklist input and a plain one
        // When their values are shown on the confirmation
        // Then the picklist shows the option text, and an unknown option or a plain value shows as it is
        expect(getBankFieldDisplayValue(HOLDER_COUNTRY, 'DE')).toBe('Germany');
        expect(getBankFieldDisplayValue(HOLDER_COUNTRY, 'XX')).toBe('XX');
        expect(getBankFieldDisplayValue(IBAN, VALID_IBAN)).toBe(VALID_IBAN);
    });
});
