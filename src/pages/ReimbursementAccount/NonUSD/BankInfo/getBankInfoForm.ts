/**
 * The "Bank info" step of the non-USD bank account setup as a DynamicForm schema, built from the Corpay fields the server sends for the bank's country and currency.
 * Page keys are the sub page names in the URL, and field keys are the Corpay field IDs, which are also the draft keys of the bank account form.
 */
import type {DynamicFormValues} from '@components/DynamicForm/types';
import getContentFields from '@components/DynamicForm/utils/getContentFields';
import toDynamicFormValues from '@components/DynamicForm/utils/toDynamicFormValues';

import putBankAddressBeforeBankCity from '@pages/ReimbursementAccount/NonUSD/utils/putBankAddressBeforeBankCity';

import CONST from '@src/CONST';
import INPUT_IDS from '@src/types/form/ReimbursementAccountForm';
import type {CorpayFields, CorpayFormField, DynamicFormField, DynamicFormPage} from '@src/types/onyx';
import type {ACHDataReimbursementAccount} from '@src/types/onyx/ReimbursementAccount';

import {Str} from 'expensify-common';

const SUB_PAGE_NAMES = CONST.NON_USD_BANK_ACCOUNT.BANK_INFO_STEP.SUB_PAGE_NAMES;
const {ADDITIONAL_DATA} = INPUT_IDS;

/** The server takes these answers under the field's ID but saves them under another key */
const SAVED_KEYS: Partial<Record<string, string>> = {
    [ADDITIONAL_DATA.ROUTING_CODE]: INPUT_IDS.BANK_INFO_STEP.ROUTING_NUMBER,
    [ADDITIONAL_DATA.CORPAY.SWIFT_BIC_CODE]: INPUT_IDS.BANK_INFO_STEP.ROUTING_NUMBER,
    [ADDITIONAL_DATA.ACCOUNT_HOLDER_NAME]: ADDITIONAL_DATA.ADDRESS_NAME,
    [ADDITIONAL_DATA.ACCOUNT_HOLDER_ADDRESS_1]: ADDITIONAL_DATA.ADDRESS_STREET,
    [ADDITIONAL_DATA.ACCOUNT_HOLDER_CITY]: ADDITIONAL_DATA.ADDRESS_CITY,
    [ADDITIONAL_DATA.ACCOUNT_HOLDER_REGION]: ADDITIONAL_DATA.ADDRESS_STATE,
    [ADDITIONAL_DATA.ACCOUNT_HOLDER_POSTAL]: ADDITIONAL_DATA.ADDRESS_ZIP_CODE,
};

function isAccountHolderField(field: CorpayFormField): boolean {
    return field.id.includes(CONST.NON_USD_BANK_ACCOUNT.BANK_INFO_STEP_ACCOUNT_HOLDER_KEY_PREFIX);
}

/** A field with a set of values is picked from them, the account holder's country from every country, and anything else is typed */
function toDynamicFormField(field: CorpayFormField): DynamicFormField {
    const base = {key: field.id, label: field.label, required: field.isRequired};
    if (field.valueSet) {
        const values = field.valueSet.filter((option) => option.code && option.text).map((option) => ({key: option.code, label: Str.recapitalize(option.text)}));
        return {...base, type: 'select', values};
    }
    if (field.id === ADDITIONAL_DATA.CORPAY.ACCOUNT_HOLDER_COUNTRY) {
        return {...base, type: 'country'};
    }
    const descriptionKey = field.id === ADDITIONAL_DATA.ACCOUNT_HOLDER_NAME ? 'bankInfoStep.accountHolderNameDescription' : undefined;
    return {...base, type: 'text', descriptionKey};
}

/** The bank's details on one page and the account holder's on the next. A page with no fields is skipped. */
function getBankInfoForm(formFields: CorpayFormField[] = []): {pages: DynamicFormPage[]} {
    const fields = putBankAddressBeforeBankCity(formFields);
    return {
        pages: [
            {
                key: SUB_PAGE_NAMES.BANK_ACCOUNT_DETAILS,
                titleKey: 'bankInfoStep.whatAreYour',
                sectionTitleKey: 'addPersonalBankAccount.bankDetails',
                content: fields.filter((field) => !isAccountHolderField(field)).map(toDynamicFormField),
            },
            {
                key: SUB_PAGE_NAMES.ACCOUNT_HOLDER_DETAILS,
                titleKey: 'bankInfoStep.whatAreYour',
                sectionTitleKey: 'addPersonalBankAccount.accountHolderDetails',
                content: fields.filter(isAccountHolderField).map(toDynamicFormField),
            },
        ],
    };
}

/** Corpay's format rules for the fields of a page, with Corpay's own messages, which say more than a generic format error */
function getBankInfoRuleErrors(formFields: CorpayFormField[] | undefined, page: DynamicFormPage, values: DynamicFormValues): Record<string, string> {
    const pageKeys = new Set(getContentFields(page.content).map((field) => field.key));
    const errors: Record<string, string> = {};
    for (const field of (formFields ?? []).filter((formField) => pageKeys.has(formField.id))) {
        const value = values[field.id];
        const failedRule = field.validationRules.find((rule) => rule.regEx && !new RegExp(rule.regEx).test(typeof value === 'string' ? value : ''));
        if (failedRule) {
            errors[field.id] = failedRule.errorMessage;
        }
    }
    return errors;
}

/** The form's answers with the account details Corpay picked for the country and currency, as the bank account API takes them */
function getBankInfoParams(answers: DynamicFormValues, corpayFields: CorpayFields | undefined): DynamicFormValues {
    return {
        ...answers,
        bankCountry: corpayFields?.bankCountry,
        bankCurrency: corpayFields?.bankCurrency,
        classification: corpayFields?.classification,
        destinationCountry: corpayFields?.destinationCountry,
        paymentMethods: corpayFields?.paymentMethods,
        preferredMethod: corpayFields?.preferredMethod,
    };
}

/** The answers the bank account already holds, under the form's draft keys. The account holder's country starts as the bank's country. */
function getBankInfoPrefill(formFields: CorpayFormField[] | undefined, achData: Partial<ACHDataReimbursementAccount> | undefined, bankCountry: string): DynamicFormValues {
    const saved = toDynamicFormValues(achData);
    const savedCorpay = toDynamicFormValues(achData?.corpay);
    return Object.fromEntries(
        (formFields ?? []).map((field) => {
            const savedValue = saved[SAVED_KEYS[field.id] ?? field.id] ?? savedCorpay[field.id];
            return [field.id, field.id === ADDITIONAL_DATA.CORPAY.ACCOUNT_HOLDER_COUNTRY ? savedValue || bankCountry : savedValue];
        }),
    );
}

export default getBankInfoForm;
export {getBankInfoParams, getBankInfoPrefill, getBankInfoRuleErrors};
