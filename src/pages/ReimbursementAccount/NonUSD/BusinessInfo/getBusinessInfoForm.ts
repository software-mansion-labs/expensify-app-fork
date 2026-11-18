/**
 * The "Business info" step of the non-USD bank account setup as a DynamicForm schema, built for the bank's country and currency with the option lists Corpay sends for that country.
 * Page keys are the sub page names in the URL, and field keys are the draft keys of the bank account form.
 * The form keeps the city, state and zip under the street's key, while the bank account keeps each under its own key, so the answers are mapped both ways here.
 */
import type {DynamicFormValues} from '@components/DynamicForm/types';
import getAddressInputKeys from '@components/DynamicForm/utils/getAddressInputKeys';
import getContentFields from '@components/DynamicForm/utils/getContentFields';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {SaveCorpayOnboardingCompanyDetails} from '@libs/API/parameters/SaveCorpayOnboardingCompanyDetailsParams';
import {getRegistrationNumberHelpURL} from '@libs/BankAccountUtils';
import {isValidCompanyName, isValidEmail, isValidRegistrationNumber, isValidTaxIDEINNumber} from '@libs/ValidationUtils';

import getListOptionsFromCorpayPicklist from '@pages/ReimbursementAccount/NonUSD/utils/getListOptionsFromCorpayPicklist';

import CONST from '@src/CONST';
import type {Country} from '@src/CONST';
import STATES_BY_COUNTRY from '@src/CONST/STATES_BY_COUNTRY';
import INPUT_IDS from '@src/types/form/ReimbursementAccountForm';
import type {CorpayOnboardingFields, DynamicFormField, DynamicFormFieldOption, DynamicFormPage} from '@src/types/onyx';
import type {Picklist} from '@src/types/onyx/CorpayOnboardingFields';
import type {ACHDataReimbursementAccount, Corpay} from '@src/types/onyx/ReimbursementAccount';

import {Str} from 'expensify-common';

const KEYS = INPUT_IDS.ADDITIONAL_DATA.CORPAY;
const SUB_PAGE_NAMES = CONST.NON_USD_BANK_ACCOUNT.BUSINESS_INFO_STEP.SUB_PAGE_NAMES;
const ADDRESS_KEYS = getAddressInputKeys(KEYS.COMPANY_STREET);

/** The answers the bank account saves under the same key the form drafts them under */
const SAME_KEYS = [
    KEYS.COMPANY_NAME,
    KEYS.BUSINESS_CONTACT_NUMBER,
    KEYS.BUSINESS_REGISTRATION_INCORPORATION_NUMBER,
    KEYS.TAX_ID_EIN_NUMBER,
    KEYS.APPLICANT_TYPE_ID,
    KEYS.BUSINESS_CATEGORY,
    KEYS.BUSINESS_TYPE_ID,
    KEYS.ANNUAL_VOLUME,
    KEYS.TRADE_VOLUME,
];

/** Only these countries are asked for the state the business was incorporated in */
const INCORPORATION_STATE_OPTIONS: Record<string, DynamicFormFieldOption[]> = Object.fromEntries(
    [CONST.COUNTRY.US, CONST.COUNTRY.CA].map((country) => [country, Object.entries(STATES_BY_COUNTRY[country] ?? {}).map(([key, label]) => ({key, label}))]),
);

type BusinessInfoFormContext = {
    country: Country | '';
    currency: string;
    picklists: CorpayOnboardingFields['picklists'] | undefined;
    translate: LocalizedTranslate;
};

/** The parts of the bank account the step reads its saved answers from */
type BusinessInfoAchData = Pick<Partial<ACHDataReimbursementAccount>, 'website'> & {corpay?: Partial<Corpay>};

function toOptions(picklist: Picklist | undefined): DynamicFormFieldOption[] {
    return Object.entries(getListOptionsFromCorpayPicklist(picklist)).map(([key, label]) => ({key, label}));
}

function getBusinessInfoForm({country, currency, picklists, translate}: BusinessInfoFormContext): {pages: DynamicFormPage[]} {
    // Corpay does not ask Canadian businesses for a business type
    const businessTypeFields: DynamicFormField[] =
        country === CONST.COUNTRY.CA
            ? []
            : [{key: KEYS.BUSINESS_TYPE_ID, type: 'select', required: true, values: toOptions(picklists?.BusinessType), labelKey: 'businessInfoStep.businessType'}];

    return {
        pages: [
            {
                key: SUB_PAGE_NAMES.NAME,
                titleKey: 'businessInfoStep.whatsTheBusinessName',
                content: [{key: KEYS.COMPANY_NAME, type: 'text', required: true, labelKey: 'businessInfoStep.legalBusinessName'}],
            },
            {
                key: SUB_PAGE_NAMES.WEBSITE,
                titleKey: 'businessInfoStep.enterYourCompanyWebsite',
                descriptionKey: 'common.websiteExample',
                content: [{key: KEYS.COMPANY_WEBSITE, type: 'text', required: true, rule: 'website', labelKey: 'businessInfoStep.companyWebsite'}],
            },
            {
                key: SUB_PAGE_NAMES.ADDRESS,
                titleKey: 'businessInfoStep.whatsTheBusinessAddress',
                descriptionKey: 'personalInfoStep.addressSubtitle',
                content: [{key: KEYS.COMPANY_STREET, type: 'address', required: true, rule: 'zipCode', country: country || undefined, labelKey: 'businessInfoStep.businessAddress'}],
            },
            {
                key: SUB_PAGE_NAMES.CONTACT_INFORMATION,
                titleKey: 'businessInfoStep.whatsTheBusinessContactInformation',
                content: [
                    {key: KEYS.BUSINESS_CONTACT_NUMBER, type: 'text', required: true, rule: 'phone', labelKey: 'common.phoneNumber'},
                    {key: KEYS.BUSINESS_CONFIRMATION_EMAIL, type: 'text', required: true, keyboard: 'email', labelKey: 'common.email'},
                ],
            },
            {
                key: SUB_PAGE_NAMES.REGISTRATION_NUMBER,
                title: translate('businessInfoStep.whatsTheBusinessRegistrationNumber', country),
                content: [
                    {key: KEYS.BUSINESS_REGISTRATION_INCORPORATION_NUMBER, type: 'text', required: true, labelKey: 'businessInfoStep.registrationNumber'},
                    {key: 'registrationNumberHelp', url: getRegistrationNumberHelpURL(country), textKey: 'businessInfoStep.whatsThisNumber'},
                ],
            },
            {
                key: SUB_PAGE_NAMES.TAX_ID_EIN_NUMBER,
                title: translate('businessInfoStep.whatsTheBusinessTaxIDEIN', country),
                content: [{key: KEYS.TAX_ID_EIN_NUMBER, type: 'text', required: true, label: translate('businessInfoStep.taxIDEIN', country)}],
            },
            {
                key: SUB_PAGE_NAMES.INCORPORATION_LOCATION,
                titleKey: 'businessInfoStep.whereWasTheBusinessIncorporated',
                content: [
                    {key: KEYS.FORMATION_INCORPORATION_COUNTRY_CODE, type: 'country', required: true, labelKey: 'businessInfoStep.incorporationCountry'},
                    {
                        key: KEYS.FORMATION_INCORPORATION_STATE,
                        type: 'select',
                        required: true,
                        dependsOn: {key: KEYS.FORMATION_INCORPORATION_COUNTRY_CODE, valuesBy: INCORPORATION_STATE_OPTIONS},
                        showWhen: {key: KEYS.FORMATION_INCORPORATION_COUNTRY_CODE, equals: Object.keys(INCORPORATION_STATE_OPTIONS)},
                        labelKey: 'businessInfoStep.incorporationState',
                    },
                ],
            },
            {
                key: SUB_PAGE_NAMES.BUSINESS_TYPE,
                titleKey: 'businessInfoStep.whatTypeOfBusinessIsIt',
                content: [
                    {key: KEYS.APPLICANT_TYPE_ID, type: 'select', required: true, values: toOptions(picklists?.ApplicantType), labelKey: 'businessInfoStep.incorporationTypeName'},
                    {key: KEYS.BUSINESS_CATEGORY, type: 'select', required: true, values: toOptions(picklists?.NatureOfBusiness), labelKey: 'businessInfoStep.businessCategory'},
                    ...businessTypeFields,
                ],
            },
            {
                key: SUB_PAGE_NAMES.PAYMENT_VOLUME,
                titleKey: 'businessInfoStep.whatsTheBusinessAnnualPayment',
                content: [
                    {
                        key: KEYS.ANNUAL_VOLUME,
                        type: 'select',
                        required: true,
                        values: toOptions(picklists?.AnnualVolumeRange),
                        label: translate('businessInfoStep.annualPaymentVolumeInCurrency', currency),
                    },
                ],
            },
            {
                key: SUB_PAGE_NAMES.AVERAGE_REIMBURSEMENT,
                titleKey: 'businessInfoStep.whatsYourExpectedAverageReimbursements',
                content: [
                    {
                        key: KEYS.TRADE_VOLUME,
                        type: 'select',
                        required: true,
                        values: toOptions(picklists?.TradeVolumeRange),
                        label: translate('businessInfoStep.averageReimbursementAmountInCurrency', currency),
                    },
                ],
            },
        ],
    };
}

type BusinessInfoRule = {
    key: string;
    isValid: (value: string, country: Country | '') => boolean;
    getError: (translate: LocalizedTranslate, country: Country | '') => string;
};

/** Checks that depend on the country or have their own message, keyed by the field they show under */
const RULES: BusinessInfoRule[] = [
    {key: KEYS.COMPANY_NAME, isValid: isValidCompanyName, getError: (translate) => translate('bankAccount.error.companyName')},
    {key: KEYS.BUSINESS_CONFIRMATION_EMAIL, isValid: isValidEmail, getError: (translate) => translate('common.error.email')},
    {key: KEYS.BUSINESS_REGISTRATION_INCORPORATION_NUMBER, isValid: isValidRegistrationNumber, getError: (translate) => translate('businessInfoStep.error.registrationNumber')},
    {key: KEYS.TAX_ID_EIN_NUMBER, isValid: isValidTaxIDEINNumber, getError: (translate, country) => translate('businessInfoStep.error.taxIDEIN', country)},
];

/** Errors of the checks above for the fields of one page, since an error under a field of another page would block Next without showing */
function getBusinessInfoRuleErrors(page: DynamicFormPage, values: DynamicFormValues, country: Country | '', translate: LocalizedTranslate): Record<string, string> {
    const pageKeys = new Set(getContentFields(page.content).map((field) => field.key));
    const errors: Record<string, string> = {};
    for (const {key, isValid, getError} of RULES) {
        const value = values[key];
        if (pageKeys.has(key) && typeof value === 'string' && value !== '' && !isValid(value, country)) {
            errors[key] = getError(translate, country);
        }
    }
    return errors;
}

/** The form's answers as the Corpay onboarding API takes them, with the country and currency of the bank */
function getBusinessInfoParams(answers: DynamicFormValues, country: Country | '', currency: string, isProduction: boolean): SaveCorpayOnboardingCompanyDetails & {websiteUrl: string} {
    const getText = (key: string) => (typeof answers[key] === 'string' ? answers[key] : '');
    const email = getText(KEYS.BUSINESS_CONFIRMATION_EMAIL);
    return {
        companyName: getText(KEYS.COMPANY_NAME),
        websiteUrl: Str.sanitizeURL(getText(KEYS.COMPANY_WEBSITE), CONST.COMPANY_WEBSITE_DEFAULT_SCHEME),
        companyStreetAddress: getText(ADDRESS_KEYS.street),
        companyCity: getText(ADDRESS_KEYS.city),
        companyState: getText(ADDRESS_KEYS.state),
        companyPostalCode: getText(ADDRESS_KEYS.zipCode),
        companyCountryCode: country,
        businessContactNumber: getText(KEYS.BUSINESS_CONTACT_NUMBER),
        // Corpay does not accept emails with a "+" character and will not let us connect account at the end of whole flow
        businessConfirmationEmail: isProduction ? email : Str.replaceAll(email, '+', ''),
        businessRegistrationIncorporationNumber: getText(KEYS.BUSINESS_REGISTRATION_INCORPORATION_NUMBER),
        taxIDEINNumber: getText(KEYS.TAX_ID_EIN_NUMBER),
        formationIncorporationCountryCode: getText(KEYS.FORMATION_INCORPORATION_COUNTRY_CODE),
        formationIncorporationState: getText(KEYS.FORMATION_INCORPORATION_STATE),
        applicantTypeId: getText(KEYS.APPLICANT_TYPE_ID),
        natureOfBusiness: getText(KEYS.BUSINESS_CATEGORY),
        businessTypeId: country === CONST.COUNTRY.CA ? undefined : getText(KEYS.BUSINESS_TYPE_ID),
        annualVolume: getText(KEYS.ANNUAL_VOLUME),
        tradeVolume: getText(KEYS.TRADE_VOLUME),
        fundSourceCountries: country,
        fundDestinationCountries: country,
        currencyNeeded: currency,
        purposeOfTransactionId: CONST.NON_USD_BANK_ACCOUNT.PURPOSE_OF_TRANSACTION_ID,
    };
}

/**
 * The answers the bank account already holds, under the form's draft keys. The website and email start from the user's email domain and login,
 * and the incorporation country and state from the business address.
 */
function getBusinessInfoPrefill(achData: BusinessInfoAchData | undefined, country: Country | '', defaultWebsite: string, primaryLogin: string | undefined): DynamicFormValues {
    const saved = achData?.corpay;
    return {
        ...Object.fromEntries(SAME_KEYS.map((key) => [key, saved?.[key]])),
        [KEYS.COMPANY_WEBSITE]: saved?.[KEYS.COMPANY_WEBSITE] ?? achData?.website ?? defaultWebsite,
        [ADDRESS_KEYS.street]: saved?.[KEYS.COMPANY_STREET],
        [ADDRESS_KEYS.city]: saved?.[KEYS.COMPANY_CITY],
        [ADDRESS_KEYS.state]: saved?.[KEYS.COMPANY_STATE],
        [ADDRESS_KEYS.zipCode]: saved?.[KEYS.COMPANY_POSTAL_CODE],
        [KEYS.BUSINESS_CONFIRMATION_EMAIL]: saved?.[KEYS.BUSINESS_CONFIRMATION_EMAIL] ?? primaryLogin,
        [KEYS.FORMATION_INCORPORATION_COUNTRY_CODE]: saved?.[KEYS.FORMATION_INCORPORATION_COUNTRY_CODE] || country,
        [KEYS.FORMATION_INCORPORATION_STATE]: saved?.[KEYS.FORMATION_INCORPORATION_STATE] || saved?.[KEYS.COMPANY_STATE],
    };
}

export default getBusinessInfoForm;
export {getBusinessInfoParams, getBusinessInfoPrefill, getBusinessInfoRuleErrors};
