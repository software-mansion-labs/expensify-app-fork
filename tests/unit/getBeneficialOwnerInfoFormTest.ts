import getAddressInputKeys from '@components/DynamicForm/utils/getAddressInputKeys';
import getContentFields from '@components/DynamicForm/utils/getContentFields';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import {translate as translatePhrase} from '@libs/Localize';

import getBeneficialOwnerInfoForm, {
    getBeneficialOwnerInfoParams,
    getBeneficialOwnerInfoPrefill,
    getOwnershipTotalErrors,
} from '@pages/ReimbursementAccount/NonUSD/BeneficialOwnerInfo/getBeneficialOwnerInfoForm';

import CONST from '@src/CONST';
import IntlStore from '@src/languages/IntlStore';
import type {DynamicFormPage} from '@src/types/onyx';

const translate: LocalizedTranslate = (path, ...parameters) => translatePhrase(CONST.LOCALES.EN, path, ...parameters);

/** Draft and request keys hold an owner ID and a field, which object literals can only name as computed keys */
const ownerKey = (id: string, field: string) => `beneficialOwner_${id}_${field}`;
const ADDRESS = getAddressInputKeys('street');

const owner = {
    id: 'owner1',
    firstName: 'Jane',
    lastName: 'Doe',
    nationality: 'GB',
    ownershipPercentage: '40',
    dob: '1990-01-01',
    street: '1 High St',
    [ADDRESS.city]: 'London',
    [ADDRESS.zipCode]: 'SW1A 1AA',
    [ADDRESS.country]: 'GB',
    ssn: '123456789',
};

function getUserDocumentsPage(currency: string, accountCountry: string): DynamicFormPage | undefined {
    return getBeneficialOwnerInfoForm(translate, 'Acme', true, currency, accountCountry).pages.find(
        (page) => page.key === CONST.NON_USD_BANK_ACCOUNT.BENEFICIAL_OWNER_INFO_STEP.SUB_PAGE_NAMES.DOCUMENTS,
    );
}

describe('getBeneficialOwnerInfoForm', () => {
    beforeAll(() => IntlStore.load(CONST.LOCALES.EN));

    it('asks for the documents of a GBP account only from owners living outside the UK', () => {
        // Given a GBP account, where Corpay checks the identity of owners abroad, and an Italian EUR account, which also needs the tax code
        // When the schema is built for each
        const gbpFields = getContentFields(getUserDocumentsPage(CONST.CURRENCY.GBP, CONST.COUNTRY.GB)?.content ?? []);
        const eurFields = getContentFields(getUserDocumentsPage(CONST.CURRENCY.EUR, CONST.COUNTRY.IT)?.content ?? []);

        // Then every GBP document waits for an address outside the UK, while the EUR documents are always asked
        expect(gbpFields.map((field) => field.key)).toEqual([
            'beneficialOwner_currentUser_proofOfBeneficialOwner',
            'beneficialOwner_currentUser_copyOfIDForBeneficialOwner',
            'beneficialOwner_currentUser_addressProofForBeneficialOwner',
        ]);
        expect(gbpFields.every((field) => field.showWhen?.key === ownerKey('currentUser', ADDRESS.country) && !field.showWhen.equals.includes('GB'))).toBe(true);
        expect(eurFields.map((field) => [field.key, field.showWhen])).toEqual([
            ['beneficialOwner_currentUser_proofOfBeneficialOwner', undefined],
            ['beneficialOwner_currentUser_addressProofForBeneficialOwner', undefined],
            ['beneficialOwner_currentUser_codiceFiscaleTaxID', undefined],
        ]);
    });

    it('sends the user and the listed owners in the shape the old step sent', () => {
        // Given a user who owns part of the company and one more owner with a document
        const file = {name: 'proof.pdf', uri: 'file://proof.pdf'};
        const answers = {
            ownsMoreThan25Percent: true,
            [ownerKey('currentUser', 'firstName')]: 'John',
            [ownerKey('currentUser', 'lastName')]: 'Smith',
            [ownerKey('currentUser', 'nationality')]: 'US',
            [ownerKey('currentUser', 'ssn')]: '987654321',
            anyIndividualOwn25PercentOrMore: true,
            corpayBeneficialOwnerList: [{...owner, proofOfBeneficialOwner: [file]}],
        };

        // When the request is built
        const params = getBeneficialOwnerInfoParams(answers, 7);

        // Then each owner is keyed by its ID, the SSN goes only for a US citizen, and the first file of a document is its own parameter
        expect(JSON.parse(params.inputs)).toEqual({
            [ownerKey('currentUser', 'fullName')]: 'John Smith',
            [ownerKey('currentUser', 'nationality')]: 'US',
            [ownerKey('currentUser', 'ssn')]: '987654321',
            [ownerKey('owner1', 'fullName')]: 'Jane Doe',
            [ownerKey('owner1', 'ownershipPercentage')]: '40',
            [ownerKey('owner1', 'dob')]: '1990-01-01',
            [ownerKey('owner1', 'residentialAddress')]: '1 High St, London, SW1A 1AA, GB',
            [ownerKey('owner1', 'nationality')]: 'GB',
            anyIndividualOwn25PercentOrMore: true,
        });
        expect(params.beneficialOwner_owner1_proofOfBeneficialOwner).toEqual(file);
        expect(params.beneficialOwnerIDs).toBe('currentUser,owner1');
        expect(params.bankAccountID).toBe(7);
    });

    it('sends no owners when nobody owns 25% or more', () => {
        // Given answers that say no to both questions, while the list still holds an owner from an earlier answer
        const answers = {ownsMoreThan25Percent: false, anyIndividualOwn25PercentOrMore: false, corpayBeneficialOwnerList: [owner]};

        // When the request is built
        const params = getBeneficialOwnerInfoParams(answers, 7);

        // Then the stale owner is left out, since the answers no longer show the list
        expect(JSON.parse(params.inputs)).toEqual({anyIndividualOwn25PercentOrMore: false});
        expect(params.beneficialOwnerIDs).toBeUndefined();
    });

    it('stops the owners from holding more than 100% together', () => {
        // Given a user who owns 70% and a listed owner with 40%
        const values = {
            ownsMoreThan25Percent: true,
            [ownerKey('currentUser', 'ownershipPercentage')]: '70',
            anyIndividualOwn25PercentOrMore: true,
            corpayBeneficialOwnerList: [owner],
        };
        const listPage = getBeneficialOwnerInfoForm(translate, 'Acme', true, CONST.CURRENCY.EUR, CONST.COUNTRY.FR).pages.find(
            (page) => page.key === CONST.NON_USD_BANK_ACCOUNT.BENEFICIAL_OWNER_INFO_STEP.SUB_PAGE_NAMES.BENEFICIAL_OWNERS_LIST,
        );

        // When the list page is checked on Next
        const errors = listPage ? getOwnershipTotalErrors(listPage, values, translate) : {};

        // Then the error shows under the list, since one of the shares there has to change
        expect(errors).toEqual({corpayBeneficialOwnerList: translate('bankAccount.error.ownershipPercentage')});
    });

    it('prefills the saved owners, the user under their own keys and the others in the list', () => {
        // Given a bank account that saved the user and one more owner, each with a single name and address string
        const corpay = {
            ownsMoreThan25Percent: true,
            anyIndividualOwn25PercentOrMore: true,
            beneficialOwners: [
                {uid: 'currentUser', fullName: 'John Paul Smith', residentialAddress: '1 Main St, Toronto, ON, M5H 2N2, CA', nationality: 'CA', ownershipPercentage: '50', dob: '1980-02-02'},
                {uid: 'owner1', fullName: 'Jane Doe', residentialAddress: '1 High St, London, LDN, SW1A 1AA, GB', nationality: 'GB', ownershipPercentage: '40', dob: '1990-01-01'},
            ],
        };

        // When the prefill is built
        const prefill = getBeneficialOwnerInfoPrefill(corpay);

        // Then the strings are split back into the fields, and "anyone else" is answered from the other owners, since the server keeps one flag for everyone
        expect(prefill).toMatchObject({
            ownsMoreThan25Percent: true,
            anyIndividualOwn25PercentOrMore: true,
            [ownerKey('currentUser', 'firstName')]: 'John',
            [ownerKey('currentUser', 'lastName')]: 'Smith',
            [ownerKey('currentUser', ADDRESS.state)]: 'ON',
            [ownerKey('currentUser', ADDRESS.country)]: 'CA',
            corpayBeneficialOwnerList: [{id: 'owner1', firstName: 'Jane', lastName: 'Doe', street: '1 High St', [ADDRESS.zipCode]: 'SW1A 1AA', ownershipPercentage: '40'}],
        });
    });
});
