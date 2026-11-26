import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import type {FlowData} from '@pages/SimplifiedBankOnboarding/core';
import finishOnboardingRequest from '@pages/SimplifiedBankOnboarding/flows/nonUSD/agreements/finishOnboardingRequest';
import {getCreateBankAccountRequest} from '@pages/SimplifiedBankOnboarding/flows/nonUSD/bankInfo/bankInfoRequests';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

const {EUR, AUD} = SBO_CONST.CURRENCY;
const BANK_ACCOUNT = {policyID: '1', bankAccountID: 42};
const VALID_IBAN = 'DE89370400440532013000';
const GERMAN_FIELD_IDS = [INPUT_IDS.IBAN, INPUT_IDS.SWIFT_BIC_CODE, INPUT_IDS.ACCOUNT_HOLDER_NAME, INPUT_IDS.ACCOUNT_HOLDER_COUNTRY];
const AGREEMENTS = {
    authorizedToBindClientToAgreement: true,
    agreeToTermsAndConditions: true,
    consentToPrivacyNotice: true,
};
const BANK_STATEMENT = {name: 'statement.pdf', uri: 'file://statement.pdf'};
const AUTHORIZATION_FORM = {
    name: 'authorization.pdf',
    uri: 'file://authorization.pdf',
};

function getSavedData(saved: Partial<FlowData>): FlowData {
    return {
        bankAccount: BANK_ACCOUNT,
        account: undefined,
        draft: {},
        currency: EUR,
        ...saved,
    };
}

describe('nonUSD requests', () => {
    it('sends exactly the inputs that the server described, with an empty text for an input without an answer', () => {
        // Given German answers without a SWIFT code, and a BSB number left in the draft from an Australian attempt
        const saved = getSavedData({
            draft: {
                country: SBO_CONST.COUNTRY.DE,
                iban: VALID_IBAN,
                accountHolderName: 'Alberta',
                accountHolderCountry: SBO_CONST.COUNTRY.DE,
                bsbNumber: '123456',
            },
        });

        // When the account request is built for the German inputs
        const spec = getCreateBankAccountRequest(GERMAN_FIELD_IDS).build(saved);

        // Then the fields hold every German input and nothing else, as before the rewrite, so the old answer of
        // another country never reaches the server
        expect(spec).toMatchObject({
            type: 'write',
            command: WRITE_COMMANDS.CREATE_GLOBAL_BANK_ACCOUNT,
            params: {
                policyID: BANK_ACCOUNT.policyID,
                country: SBO_CONST.COUNTRY.DE,
                currency: EUR,
                fields: {
                    iban: VALID_IBAN,
                    swiftBicCode: '',
                    accountHolderName: 'Alberta',
                    accountHolderCountry: SBO_CONST.COUNTRY.DE,
                },
            },
        });
    });

    it('builds no account request without a workspace', () => {
        // Given a bank account that has no workspace
        const saved = getSavedData({
            bankAccount: {policyID: undefined, bankAccountID: 42},
            draft: {country: SBO_CONST.COUNTRY.DE, iban: VALID_IBAN},
        });

        // When the account request is built
        const spec = getCreateBankAccountRequest(GERMAN_FIELD_IDS).build(saved);

        // Then nothing is built, so the confirmation shows the generic error instead of sending a broken request (BC-20)
        expect(spec).toBeUndefined();
    });

    it('builds no account request while the currency is unknown', () => {
        // Given German answers, but no workspace, account or draft that names the currency
        const saved = getSavedData({
            currency: undefined,
            draft: {country: SBO_CONST.COUNTRY.DE, iban: VALID_IBAN},
        });

        // When the account request is built
        const spec = getCreateBankAccountRequest(GERMAN_FIELD_IDS).build(saved);

        // Then nothing is built, so the server never gets an account without a currency
        expect(spec).toBeUndefined();
    });

    it('ends a setup without a docusign step with the agreements only', () => {
        // Given a EUR setup with every agreement checked and a file left in the draft
        const saved = getSavedData({
            draft: {...AGREEMENTS, bankStatement: [BANK_STATEMENT]},
        });

        // When the agreements step builds the finish request
        const spec = finishOnboardingRequest.build(saved);

        // Then only the agreements are sent, as the agreements step did before the rewrite
        expect(spec?.params).toEqual({...BANK_ACCOUNT, ...AGREEMENTS});
    });

    it('ends an AUD setup with the names of the bank statement and the authorization form', () => {
        // Given an AUD setup with the agreements, the bank statement and the signed authorization form in the draft
        const saved = getSavedData({
            currency: AUD,
            draft: {
                ...AGREEMENTS,
                bankStatement: [BANK_STATEMENT],
                achAuthorizationForm: [AUTHORIZATION_FORM],
            },
        });

        // When the docusign step builds the finish request
        const spec = finishOnboardingRequest.build(saved);

        // Then the names of both files are sent, because the server records which files the user gave
        expect(spec?.params).toEqual({
            ...BANK_ACCOUNT,
            ...AGREEMENTS,
            bankStatementName: BANK_STATEMENT.name,
            achAuthorizationFormName: AUTHORIZATION_FORM.name,
        });
    });
});
