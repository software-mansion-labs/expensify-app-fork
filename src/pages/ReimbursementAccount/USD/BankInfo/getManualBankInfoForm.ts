/**
 * The manual variant of the "Bank info" step of the USD bank account setup as a DynamicForm schema: one page with the routing and account numbers.
 * The page key is the sub page name in the URL, and the field keys are the draft keys of the bank account form.
 */
import type {DynamicFormValues} from '@components/DynamicForm/types';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import {isValidRoutingNumber} from '@libs/ValidationUtils';

import CONST from '@src/CONST';
import INPUT_IDS from '@src/types/form/ReimbursementAccountForm';
import type {DynamicFormSchema} from '@src/types/onyx';
import type PlaidBankAccount from '@src/types/onyx/PlaidBankAccount';
import type {ACHDataReimbursementAccount} from '@src/types/onyx/ReimbursementAccount';

const KEYS = INPUT_IDS.BANK_INFO_STEP;

/** The bank details the API takes with the numbers, kept from an earlier Plaid connection when there was one */
type SavedBankDetails = Required<Pick<PlaidBankAccount, 'bankName' | 'plaidAccountID' | 'plaidAccessToken' | 'mask'>>;

/** The numbers cannot change once the bank account exists, so `isLocked` shows them as read-only rows */
function getManualBankInfoForm(isLocked: boolean) {
    return {
        pages: [
            {
                key: CONST.BANK_ACCOUNT.BANK_INFO_STEP.SUB_PAGE_NAMES.MANUAL,
                titleKey: 'bankAccount.manuallyAdd',
                descriptionKey: 'bankAccount.checkHelpLine',
                content: [
                    {key: KEYS.ROUTING_NUMBER, type: 'text', required: true, readonly: isLocked, keyboard: 'numeric', labelKey: 'bankAccount.routingNumber'},
                    {key: KEYS.ACCOUNT_NUMBER, type: 'text', required: true, readonly: isLocked, keyboard: 'numeric', labelKey: 'bankAccount.accountNumber'},
                ],
            },
        ],
    } satisfies DynamicFormSchema;
}

function getText(answers: DynamicFormValues, key: string): string {
    const answer = answers[key];
    return typeof answer === 'string' ? answer.trim() : '';
}

/** Checks of the two numbers together, run on top of each field's required check. The server sends the account number back masked, so a masked one passes. */
function getManualBankInfoErrors(answers: DynamicFormValues, translate: LocalizedTranslate): Record<string, string> {
    const routingNumber = getText(answers, KEYS.ROUTING_NUMBER);
    const accountNumber = getText(answers, KEYS.ACCOUNT_NUMBER);
    const errors: Record<string, string> = {};
    if (accountNumber && !CONST.BANK_ACCOUNT.REGEX.US_ACCOUNT_NUMBER.test(accountNumber) && !CONST.BANK_ACCOUNT.REGEX.MASKED_US_ACCOUNT_NUMBER.test(accountNumber)) {
        errors[KEYS.ACCOUNT_NUMBER] = translate('bankAccount.error.accountNumber');
    } else if (accountNumber && accountNumber === routingNumber) {
        errors[KEYS.ACCOUNT_NUMBER] = translate('bankAccount.error.routingAndAccountNumberCannotBeSame');
    }
    if (routingNumber && (!CONST.BANK_ACCOUNT.REGEX.SWIFT_BIC.test(routingNumber) || !isValidRoutingNumber(routingNumber))) {
        errors[KEYS.ROUTING_NUMBER] = translate('bankAccount.error.routingNumber');
    }
    return errors;
}

/** The numbers the user entered, with the bank details the API takes alongside them */
function getManualBankInfoParams(answers: DynamicFormValues, saved: SavedBankDetails): PlaidBankAccount {
    const getAnswer = (key: string) => (typeof answers[key] === 'string' ? answers[key] : '');
    return {
        [KEYS.ROUTING_NUMBER]: getAnswer(KEYS.ROUTING_NUMBER),
        [KEYS.ACCOUNT_NUMBER]: getAnswer(KEYS.ACCOUNT_NUMBER),
        [KEYS.BANK_NAME]: saved.bankName,
        [KEYS.PLAID_ACCOUNT_ID]: saved.plaidAccountID,
        [KEYS.PLAID_ACCESS_TOKEN]: saved.plaidAccessToken,
        [KEYS.PLAID_MASK]: saved.mask,
        [KEYS.IS_SAVINGS]: false,
    };
}

/** The numbers the bank account already holds, under the form's draft keys */
function getManualBankInfoPrefill(achData: Pick<ACHDataReimbursementAccount, 'routingNumber' | 'accountNumber'> | undefined): DynamicFormValues {
    return {
        [KEYS.ROUTING_NUMBER]: achData?.routingNumber,
        [KEYS.ACCOUNT_NUMBER]: achData?.accountNumber,
    };
}

export default getManualBankInfoForm;
export {getManualBankInfoErrors, getManualBankInfoParams, getManualBankInfoPrefill};
