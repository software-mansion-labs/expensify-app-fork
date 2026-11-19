/**
 * Helpers for the bank inputs that the server describes in the NonUSD flow: which inputs belong to which sub page, their
 * keys and the check of a value against the rules that came with the input.
 */
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {BankFieldID, BankFields, BankFormField} from '@pages/SimplifiedBankOnboarding/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

import type {SubStepValues} from './getSubStepValues';

const {ACCOUNT_HOLDER_KEY_PREFIX, SUBSTEP_INDEX} = SBO_CONST.NON_USD;
const CONFIRMATION_INDEX = SUBSTEP_INDEX.BANK_INFO.ACCOUNT_HOLDER_DETAILS + 1;

/** The only thing that tells the two groups of inputs apart is the prefix of the input ID */
function isAccountHolderField(field: BankFormField): boolean {
    return field.id.startsWith(ACCOUNT_HOLDER_KEY_PREFIX);
}

function getBankAccountDetailsFields(bankFields: OnyxEntry<BankFields>): BankFormField[] {
    return (bankFields?.formFields ?? []).filter((field) => !isAccountHolderField(field));
}

function getAccountHolderDetailsFields(bankFields: OnyxEntry<BankFields>): BankFormField[] {
    return (bankFields?.formFields ?? []).filter(isAccountHolderField);
}

function getInputKeysForBankInfoStep(bankFields: OnyxEntry<BankFields>): Record<string, BankFieldID> {
    const inputKeys: Record<string, BankFieldID> = {};
    for (const field of bankFields?.formFields ?? []) {
        inputKeys[field.id] = field.id;
    }
    return inputKeys;
}

/** Returns the message of the first rule that the value breaks */
function getBankFieldRuleError(field: BankFormField, value: string): string | undefined {
    return field.validationRules.find((rule) => !!rule.regEx && !new RegExp(rule.regEx).test(value))?.errorMessage;
}

function isBankFieldInvalidOrMissing(field: BankFormField, values: Partial<SubStepValues<BankFieldID>>): boolean {
    const value = values[field.id];
    return !value || !!getBankFieldRuleError(field, value);
}

/** Returns the index of the first sub page of the bank step that still misses valid data */
function getInitialSubStepForBankInfo(values: Partial<SubStepValues<BankFieldID>>, bankFields: OnyxEntry<BankFields>): number {
    if (!bankFields?.formFields) {
        return SUBSTEP_INDEX.BANK_INFO.BANK_ACCOUNT_DETAILS;
    }
    if (getBankAccountDetailsFields(bankFields).some((field) => isBankFieldInvalidOrMissing(field, values))) {
        return SUBSTEP_INDEX.BANK_INFO.BANK_ACCOUNT_DETAILS;
    }
    if (getAccountHolderDetailsFields(bankFields).some((field) => isBankFieldInvalidOrMissing(field, values))) {
        return SUBSTEP_INDEX.BANK_INFO.ACCOUNT_HOLDER_DETAILS;
    }
    return CONFIRMATION_INDEX;
}

export {getAccountHolderDetailsFields, getBankAccountDetailsFields, getBankFieldRuleError, getInitialSubStepForBankInfo, getInputKeysForBankInfoStep, isAccountHolderField};
