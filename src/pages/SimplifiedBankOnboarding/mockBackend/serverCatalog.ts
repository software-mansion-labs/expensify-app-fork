/**
 * Static data that the mock backend serves: the bank accounts behind the fake Plaid login, the bank inputs that each
 * country needs and the picklists of the global flow.
 */
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import type {BankFormField, PlaidBankAccount} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';

const PLAID_BANK_ACCOUNTS: PlaidBankAccount[] = [
    {plaidAccountID: 'plaid-checking', bankName: 'First Platypus Bank', accountNumber: '1111222233330000', routingNumber: '011401533', mask: '0000'},
    {plaidAccountID: 'plaid-savings', bankName: 'First Platypus Bank', accountNumber: '1111222233331111', routingNumber: '011401533', mask: '1111'},
    {plaidAccountID: 'plaid-business', bankName: 'Second Gopher Bank', accountNumber: '9999888877772222', routingNumber: '021000021', mask: '2222'},
];

const BUSINESS_TYPES = [
    {id: 'COMPANY', name: 'Private company'},
    {id: 'PARTNERSHIP', name: 'Partnership'},
    {id: 'NON_PROFIT', name: 'Non-profit'},
];

const AUSTRALIAN_REGIONS = [
    {id: 'NSW', text: 'New South Wales'},
    {id: 'VIC', text: 'Victoria'},
    {id: 'QLD', text: 'Queensland'},
];

const IBAN_RULES: Record<string, {regEx: string; errorMessage: string}> = {
    [SBO_CONST.COUNTRY.DE]: {regEx: '^DE\\d{20}$', errorMessage: 'A German IBAN is DE followed by 20 digits'},
    [SBO_CONST.COUNTRY.FR]: {regEx: '^FR[0-9A-Z]{25}$', errorMessage: 'A French IBAN is FR followed by 25 characters'},
    [SBO_CONST.COUNTRY.ES]: {regEx: '^ES\\d{22}$', errorMessage: 'A Spanish IBAN is ES followed by 22 digits'},
};

const ACCOUNT_HOLDER_NAME_FIELD: BankFormField = {
    id: INPUT_IDS.ACCOUNT_HOLDER_NAME,
    label: 'Account holder name',
    isRequired: true,
    validationRules: [{regEx: '^.{2,50}$', errorMessage: 'The name must have between 2 and 50 characters'}],
};

function getBankFormFields(countryISO: string): BankFormField[] | undefined {
    if (countryISO === SBO_CONST.COUNTRY.AU) {
        return [
            {id: INPUT_IDS.BSB_NUMBER, label: 'BSB number', isRequired: true, validationRules: [{regEx: '^\\d{6}$', errorMessage: 'A BSB number has 6 digits'}]},
            {id: INPUT_IDS.ACCOUNT_NUMBER, label: 'Account number', isRequired: true, validationRules: [{regEx: '^\\d{6,9}$', errorMessage: 'An account number has 6 to 9 digits'}]},
            ACCOUNT_HOLDER_NAME_FIELD,
            {id: INPUT_IDS.ACCOUNT_HOLDER_REGION, label: 'Account holder state', isRequired: true, validationRules: [], valueSet: AUSTRALIAN_REGIONS},
        ];
    }
    const ibanRule = IBAN_RULES[countryISO];
    if (!ibanRule) {
        return undefined;
    }
    return [
        {id: INPUT_IDS.IBAN, label: 'IBAN', isRequired: true, validationRules: [ibanRule]},
        {id: INPUT_IDS.SWIFT_BIC_CODE, label: 'SWIFT/BIC code', isRequired: false, validationRules: [{regEx: '^[A-Z0-9]{8,11}$', errorMessage: 'A SWIFT/BIC code has 8 to 11 characters'}]},
        ACCOUNT_HOLDER_NAME_FIELD,
        {
            id: INPUT_IDS.ACCOUNT_HOLDER_COUNTRY,
            label: 'Account holder country',
            isRequired: true,
            validationRules: [],
            valueSet: SBO_CONST.EUR_COUNTRIES.map((country) => ({id: country, text: SBO_CONST.COUNTRY_NAMES[country]})),
        },
    ];
}

export {BUSINESS_TYPES, getBankFormFields, PLAID_BANK_ACCOUNTS};
