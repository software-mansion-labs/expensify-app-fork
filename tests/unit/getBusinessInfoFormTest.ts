import getContentFields from '@components/DynamicForm/utils/getContentFields';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import {translate as translatePhrase} from '@libs/Localize';

import getBusinessInfoForm, {getBusinessInfoParams, getBusinessInfoPrefill, getBusinessInfoRuleErrors} from '@pages/ReimbursementAccount/NonUSD/BusinessInfo/getBusinessInfoForm';

import CONST from '@src/CONST';
import IntlStore from '@src/languages/IntlStore';
import type {Corpay} from '@src/types/onyx/ReimbursementAccount';

const SAVED_COMPANY = {
    companyName: 'Boulder Development Ltd',
    websiteUrl: 'https://www.boulder.ca',
    companyStreetAddress: '1 King Street',
    companyCity: 'Toronto',
    companyState: 'ON',
    companyPostalCode: 'M5H 1A1',
    businessContactNumber: '+14165550132',
    businessConfirmationEmail: 'owner+test@boulder.ca',
    businessRegistrationIncorporationNumber: '123456789',
    taxIDEINNumber: '123456789RT0001',
    formationIncorporationCountryCode: 'CA',
    formationIncorporationState: 'ON',
    applicantTypeId: 'Corporation',
    natureOfBusiness: 'Construction',
    businessTypeId: 'Private',
    annualVolume: '0-25000',
    tradeVolume: '0-1000',
} satisfies Partial<Corpay>;

const translate: LocalizedTranslate = (path, ...parameters) => translatePhrase(CONST.LOCALES.EN, path, ...parameters);

describe('getBusinessInfoForm', () => {
    beforeAll(() => IntlStore.load(CONST.LOCALES.EN));

    it('sends back what the bank account holds when the user changes nothing', () => {
        // Given a Canadian bank account with a saved business info step
        const achData = {corpay: {...SAVED_COMPANY, companyCountryCode: CONST.COUNTRY.CA}};

        // When its answers prefill the form and the form's answers become API params in production
        const params = getBusinessInfoParams(getBusinessInfoPrefill(achData, CONST.COUNTRY.CA, '', undefined), CONST.COUNTRY.CA, 'CAD', true);

        // Then the address parts survive the move under the street's key and back, and the bank's country and currency go along
        expect(params).toEqual({
            ...SAVED_COMPANY,
            // Then no business type is sent, since Corpay does not ask Canadian businesses for one
            businessTypeId: undefined,
            companyCountryCode: CONST.COUNTRY.CA,
            fundSourceCountries: CONST.COUNTRY.CA,
            fundDestinationCountries: CONST.COUNTRY.CA,
            currencyNeeded: 'CAD',
            purposeOfTransactionId: CONST.NON_USD_BANK_ACCOUNT.PURPOSE_OF_TRANSACTION_ID,
        });
    });

    it('starts a new business from the user and the bank and strips "+" from the email outside production', () => {
        // Given a British bank account with nothing saved yet
        const prefill = getBusinessInfoPrefill(undefined, CONST.COUNTRY.GB, 'https://www.boulder.co.uk', 'owner+test@boulder.co.uk');

        // When the prefill becomes API params outside production
        const params = getBusinessInfoParams(prefill, CONST.COUNTRY.GB, 'GBP', false);

        // Then the website and email come from the user, the incorporation country from the bank, and the email loses its "+" since Corpay rejects it
        expect(params).toMatchObject({websiteUrl: 'https://www.boulder.co.uk', businessConfirmationEmail: 'ownertest@boulder.co.uk', formationIncorporationCountryCode: CONST.COUNTRY.GB});
    });

    it('asks Canadian businesses for no business type', () => {
        // Given the form for a Canadian bank and for a British one
        const getKeys = (country: typeof CONST.COUNTRY.CA | typeof CONST.COUNTRY.GB) =>
            getBusinessInfoForm({country, currency: 'CAD', picklists: undefined, translate}).pages.flatMap((page) => getContentFields(page.content).map((field) => field.key));

        // When their fields are listed
        // Then only the British form asks for the business type
        expect(getKeys(CONST.COUNTRY.CA)).not.toContain('businessTypeId');
        expect(getKeys(CONST.COUNTRY.GB)).toContain('businessTypeId');
    });

    it("checks the country's registration number format on the registration number page only", () => {
        // Given the Canadian form and answers with a registration number and an email in the wrong format
        const {pages} = getBusinessInfoForm({country: CONST.COUNTRY.CA, currency: 'CAD', picklists: undefined, translate});
        const registrationPage = pages.find((page) => page.key === CONST.NON_USD_BANK_ACCOUNT.BUSINESS_INFO_STEP.SUB_PAGE_NAMES.REGISTRATION_NUMBER);
        const values = {businessRegistrationIncorporationNumber: '12', businessConfirmationEmail: 'not an email'};

        // When the registration number page is checked
        const errors = registrationPage ? getBusinessInfoRuleErrors(registrationPage, values, CONST.COUNTRY.CA, translate) : {};

        // Then only its own field gets an error, since an error under a field of another page would block Next without showing
        expect(Object.keys(errors)).toEqual(['businessRegistrationIncorporationNumber']);
    });
});
