import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import getManualBankInfoForm, {getManualBankInfoErrors, getManualBankInfoParams} from '@pages/ReimbursementAccount/USD/BankInfo/getManualBankInfoForm';

import INPUT_IDS from '@src/types/form/ReimbursementAccountForm';

const KEYS = INPUT_IDS.BANK_INFO_STEP;
const VALID_ROUTING_NUMBER = '011000015';
const translate: LocalizedTranslate = (path, ...parameters) => (parameters.length > 0 ? `${path}:${parameters.length}` : path);

describe('getManualBankInfoForm', () => {
    it('shows the numbers as read-only rows once the bank account exists', () => {
        // Given a bank account that the server already created

        // When the form is built for it
        const [page] = getManualBankInfoForm(true).pages;

        // Then neither number can be edited, because the server would not take a change to them
        expect(page.content.map((field) => [field.key, field.readonly])).toEqual([
            [KEYS.ROUTING_NUMBER, true],
            [KEYS.ACCOUNT_NUMBER, true],
        ]);
    });

    it('rejects a routing number that fails the checksum and an account number equal to it', () => {
        // Given a nine digit routing number with a wrong check digit, typed into both fields
        const answers = {[KEYS.ROUTING_NUMBER]: '123456789', [KEYS.ACCOUNT_NUMBER]: '123456789'};

        // When the page is validated
        const errors = getManualBankInfoErrors(answers, translate);

        // Then both fields get the messages the step showed before it moved to the dynamic form
        expect(errors).toEqual({
            [KEYS.ROUTING_NUMBER]: 'bankAccount.error.routingNumber',
            [KEYS.ACCOUNT_NUMBER]: 'bankAccount.error.routingAndAccountNumberCannotBeSame',
        });
    });

    it('accepts a valid routing number with the masked account number the server sends back', () => {
        // Given an existing bank account whose account number the server returns masked
        const answers = {[KEYS.ROUTING_NUMBER]: VALID_ROUTING_NUMBER, [KEYS.ACCOUNT_NUMBER]: 'XXXXXXXX1111'};

        // When the page is validated
        const errors = getManualBankInfoErrors(answers, translate);

        // Then there is no error, so the user can continue past the read-only numbers
        expect(errors).toEqual({});
    });

    it('sends the typed numbers with the bank details kept from an earlier Plaid connection', () => {
        // Given numbers typed by hand after a Plaid connection saved the bank name and the access token
        const answers = {[KEYS.ROUTING_NUMBER]: VALID_ROUTING_NUMBER, [KEYS.ACCOUNT_NUMBER]: '1111222233'};
        const saved = {bankName: 'Chase', plaidAccessToken: 'access-token', plaidAccountID: '', mask: ''};

        // When the answers are turned into API params
        const params = getManualBankInfoParams(answers, saved);

        // Then the command gets the same fields as before, with the Plaid details reused and the account sent as a checking one
        expect(params).toEqual({
            routingNumber: VALID_ROUTING_NUMBER,
            accountNumber: '1111222233',
            bankName: 'Chase',
            plaidAccountID: '',
            plaidAccessToken: 'access-token',
            mask: '',
            isSavings: false,
        });
    });
});
