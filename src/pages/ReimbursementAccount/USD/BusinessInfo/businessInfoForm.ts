/**
 * The "Business info" step of the USD bank account setup as a DynamicForm schema.
 * Page keys are the sub page names in the URL, and field keys are the draft keys of the bank account form.
 * The form keeps the city, state and zip under the street's key, while the bank account keeps each under its own key, so the answers are mapped both ways here.
 */
import type {DynamicFormValues} from '@components/DynamicForm/types';
import getAddressInputKeys from '@components/DynamicForm/utils/getAddressInputKeys';

import {parsePhoneNumber} from '@libs/PhoneNumber';
import {isValidWebsite} from '@libs/ValidationUtils';

import CONST from '@src/CONST';
import {ALL_NAICS} from '@src/NAICS';
import INPUT_IDS from '@src/types/form/ReimbursementAccountForm';
import type {BankAccountStepProps, CompanyStepProps, ReimbursementAccountProps} from '@src/types/form/ReimbursementAccountForm';
import type {DynamicFormFieldOption, DynamicFormSchema} from '@src/types/onyx';
import type {ACHDataReimbursementAccount} from '@src/types/onyx/ReimbursementAccount';

import {CONST as COMMON_CONST, Str} from 'expensify-common';
import lodashPick from 'lodash/pick';

const KEYS = INPUT_IDS.BUSINESS_INFO_STEP;
const SUB_PAGE_NAMES = CONST.BANK_ACCOUNT.BUSINESS_INFO_STEP.SUB_PAGE_NAMES;
const ADDRESS_KEYS = getAddressInputKeys(KEYS.STREET);

type BankAccountFields = Partial<BankAccountStepProps & ReimbursementAccountProps>;

/** The bank account details the API takes with the company details, as the bank account and its draft hold them */
const BANK_ACCOUNT_KEYS = ['routingNumber', 'accountNumber', 'bankName', 'plaidAccountID', 'plaidAccessToken', 'isSavings'] as const satisfies ReadonlyArray<keyof BankAccountFields>;

/** Names that identify the company, which the user can no longer change once the bank account is past setup */
const LOCKABLE_KEYS = [KEYS.COMPANY_NAME, KEYS.COMPANY_TAX_ID] as const;

function isIncorporationType(key: string): key is keyof typeof CONST.INCORPORATION_TYPES {
    return Object.hasOwn(CONST.INCORPORATION_TYPES, key);
}

const INCORPORATION_TYPE_OPTIONS = Object.keys(CONST.INCORPORATION_TYPES)
    .filter(isIncorporationType)
    .map((key): DynamicFormFieldOption => ({key, labelKey: `businessInfoStep.incorporationType.${key}`}));

const STATE_OPTIONS = Object.values(COMMON_CONST.STATES).map(({stateISO}): DynamicFormFieldOption => ({key: stateISO, labelKey: `allStates.${stateISO}.stateName`}));

/** Only the six-digit codes name an industry, the shorter ones are the sectors above them */
const INDUSTRY_CODE_OPTIONS = ALL_NAICS.filter(({id}) => CONST.REGEX.INDUSTRY_CODE.test(`${id}`)).map(({id, value}): DynamicFormFieldOption => ({key: `${id}`, label: `${id} - ${value}`}));

/** The company name and tax ID the bank account holds once it is past setup */
function getLockedBusinessInfoKeys(achData: ACHDataReimbursementAccount | undefined): Set<string> {
    const isPastSetup = !!achData?.bankAccountID && achData.state !== CONST.BANK_ACCOUNT.STATE.SETUP && achData.state !== CONST.BANK_ACCOUNT.STATE.VERIFYING;
    return new Set(isPastSetup ? LOCKABLE_KEYS.filter((key) => !!achData?.[key]) : []);
}

function getBusinessInfoForm(lockedKeys: ReadonlySet<string>) {
    return {
        pages: [
            {
                key: SUB_PAGE_NAMES.NAME,
                titleKey: 'businessInfoStep.enterTheNameOfYourBusiness',
                content: [{key: KEYS.COMPANY_NAME, type: 'text', required: true, readonly: lockedKeys.has(KEYS.COMPANY_NAME), labelKey: 'businessInfoStep.businessName'}],
            },
            {
                key: SUB_PAGE_NAMES.TAX_ID,
                titleKey: 'businessInfoStep.enterYourCompanyTaxIdNumber',
                content: [
                    {
                        key: KEYS.COMPANY_TAX_ID,
                        type: 'text',
                        required: true,
                        readonly: lockedKeys.has(KEYS.COMPANY_TAX_ID),
                        regex: CONST.REGEX.TAX_ID.source,
                        labelKey: 'businessInfoStep.taxIDNumber',
                        descriptionKey: 'businessInfoStep.taxIDNumberPlaceholder',
                    },
                ],
            },
            {
                key: SUB_PAGE_NAMES.WEBSITE,
                titleKey: 'businessInfoStep.enterYourCompanyWebsite',
                descriptionKey: 'common.websiteExample',
                content: [{key: KEYS.COMPANY_WEBSITE, type: 'text', required: true, rule: 'website', labelKey: 'businessInfoStep.companyWebsite'}],
            },
            {
                key: SUB_PAGE_NAMES.PHONE,
                titleKey: 'businessInfoStep.enterYourCompanyPhoneNumber',
                content: [{key: KEYS.COMPANY_PHONE, type: 'text', required: true, rule: 'usPhone', labelKey: 'common.phoneNumber', descriptionKey: 'common.phoneNumberPlaceholder'}],
            },
            {
                key: SUB_PAGE_NAMES.ADDRESS,
                titleKey: 'businessInfoStep.enterYourCompanyAddress',
                descriptionKey: 'personalInfoStep.addressSubtitle',
                content: [{key: KEYS.STREET, type: 'address', required: true, rule: 'zipCode', country: CONST.COUNTRY.US, labelKey: 'common.companyAddress'}],
            },
            {
                key: SUB_PAGE_NAMES.TYPE,
                titleKey: 'businessInfoStep.selectYourCompanyType',
                content: [{key: KEYS.INCORPORATION_TYPE, type: 'select', required: true, values: INCORPORATION_TYPE_OPTIONS, labelKey: 'businessInfoStep.companyType'}],
            },
            {
                key: SUB_PAGE_NAMES.INCORPORATION_DATE,
                titleKey: 'businessInfoStep.selectYourCompanyIncorporationDate',
                content: [{key: KEYS.INCORPORATION_DATE, type: 'date', required: true, rule: 'pastDate', labelKey: 'businessInfoStep.incorporationDate'}],
            },
            {
                key: SUB_PAGE_NAMES.INCORPORATION_STATE,
                titleKey: 'businessInfoStep.pleaseSelectTheStateYourCompanyWasIncorporatedIn',
                content: [{key: KEYS.INCORPORATION_STATE, type: 'select', required: true, values: STATE_OPTIONS, labelKey: 'businessInfoStep.incorporationState'}],
            },
            {
                key: SUB_PAGE_NAMES.INCORPORATION_CODE,
                titleKey: 'companyStep.industryClassification',
                content: [{key: KEYS.INCORPORATION_CODE, type: 'select', required: true, values: INDUSTRY_CODE_OPTIONS, labelKey: 'companyStep.industryClassificationCode'}],
            },
        ],
    } satisfies DynamicFormSchema;
}

/** The form's answers under the names the bank account API takes them, with the bank account details it takes alongside, the draft's over the saved ones */
function getBusinessInfoParams(answers: DynamicFormValues, savedBankAccount?: BankAccountFields, draftBankAccount?: BankAccountFields): Partial<CompanyStepProps> & BankAccountFields {
    const getText = (key: string) => (typeof answers[key] === 'string' ? answers[key] : '');
    const website = Str.sanitizeURL(getText(KEYS.COMPANY_WEBSITE), CONST.COMPANY_WEBSITE_DEFAULT_SCHEME);
    return {
        ...lodashPick(savedBankAccount, BANK_ACCOUNT_KEYS),
        ...lodashPick(draftBankAccount, BANK_ACCOUNT_KEYS),
        [KEYS.COMPANY_NAME]: getText(KEYS.COMPANY_NAME),
        [KEYS.COMPANY_TAX_ID]: getText(KEYS.COMPANY_TAX_ID).replaceAll(CONST.REGEX.NON_NUMERIC, ''),
        [KEYS.COMPANY_WEBSITE]: isValidWebsite(website) ? website : undefined,
        [KEYS.COMPANY_PHONE]: parsePhoneNumber(getText(KEYS.COMPANY_PHONE), {regionCode: CONST.COUNTRY.US}).number?.significant,
        [KEYS.STREET]: getText(ADDRESS_KEYS.street),
        [KEYS.CITY]: getText(ADDRESS_KEYS.city),
        [KEYS.STATE]: getText(ADDRESS_KEYS.state),
        [KEYS.ZIP_CODE]: getText(ADDRESS_KEYS.zipCode),
        [KEYS.INCORPORATION_TYPE]: getText(KEYS.INCORPORATION_TYPE),
        [KEYS.INCORPORATION_DATE]: getText(KEYS.INCORPORATION_DATE),
        [KEYS.INCORPORATION_STATE]: getText(KEYS.INCORPORATION_STATE),
        [KEYS.INCORPORATION_CODE]: getText(KEYS.INCORPORATION_CODE),
    };
}

/** The answers the bank account already holds, under the form's draft keys */
function getBusinessInfoPrefill(saved: Partial<CompanyStepProps> | undefined): DynamicFormValues {
    return {
        [KEYS.COMPANY_NAME]: saved?.[KEYS.COMPANY_NAME],
        [KEYS.COMPANY_TAX_ID]: saved?.[KEYS.COMPANY_TAX_ID],
        [KEYS.COMPANY_WEBSITE]: saved?.[KEYS.COMPANY_WEBSITE],
        [KEYS.COMPANY_PHONE]: saved?.[KEYS.COMPANY_PHONE],
        [ADDRESS_KEYS.street]: saved?.[KEYS.STREET],
        [ADDRESS_KEYS.city]: saved?.[KEYS.CITY],
        [ADDRESS_KEYS.state]: saved?.[KEYS.STATE],
        [ADDRESS_KEYS.zipCode]: saved?.[KEYS.ZIP_CODE],
        [KEYS.INCORPORATION_TYPE]: saved?.[KEYS.INCORPORATION_TYPE],
        [KEYS.INCORPORATION_DATE]: saved?.[KEYS.INCORPORATION_DATE],
        [KEYS.INCORPORATION_STATE]: saved?.[KEYS.INCORPORATION_STATE],
        [KEYS.INCORPORATION_CODE]: saved?.[KEYS.INCORPORATION_CODE],
    };
}

export default getBusinessInfoForm;
export {getBusinessInfoParams, getBusinessInfoPrefill, getLockedBusinessInfoKeys};
