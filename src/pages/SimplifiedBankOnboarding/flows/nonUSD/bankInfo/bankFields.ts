/**
 * The rules of the bank inputs that the server describes: whether the key holds the inputs of the open account, which
 * sub page shows an input, the check of a value against the rules of its input, and the text that a value shows.
 */
import type {BankFieldID, BankFields, BankFormField} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';

import type {OnyxEntry} from 'react-native-onyx';

type SplitBankFields = {
    bankAccountFields: BankFormField[];
    accountHolderFields: BankFormField[];
};

/** Every workspace shares the bank fields key, so it may hold the inputs of another country or currency */
function areBankFieldsLoaded(bankFields: OnyxEntry<BankFields>, country: string, currency: string): boolean {
    return !!country && bankFields?.bankCountry === country && bankFields.bankCurrency === currency && bankFields.formFields !== undefined;
}

/** Only the prefix of the input ID tells the account holder inputs from the bank account inputs */
function isAccountHolderField(field: BankFormField): boolean {
    return field.id.startsWith(SBO_CONST.NON_USD.ACCOUNT_HOLDER_KEY_PREFIX);
}

function splitBankFields(formFields: BankFormField[]): SplitBankFields {
    return {
        bankAccountFields: formFields.filter((field) => !isAccountHolderField(field)),
        accountHolderFields: formFields.filter(isAccountHolderField),
    };
}

/** The message of the first rule that the value breaks */
function getBankFieldRuleError(field: BankFormField, value: string): string | undefined {
    return field.validationRules.find((rule) => !!rule.regEx && !new RegExp(rule.regEx).test(value))?.errorMessage;
}

/** An empty value answers an optional input. A value answers an input only when it passes every rule. */
function isBankFieldAnswered(field: BankFormField, value: string): boolean {
    if (!value) {
        return !field.isRequired;
    }
    return !getBankFieldRuleError(field, value);
}

function areBankFieldsAnswered(fields: BankFormField[], values: Record<BankFieldID, string>): boolean {
    return fields.every((field) => isBankFieldAnswered(field, values[field.id]));
}

/** A picklist value shows the text of its option */
function getBankFieldDisplayValue(field: BankFormField, value: string): string {
    return field.valueSet?.find((option) => option.id === value)?.text ?? value;
}

export {areBankFieldsAnswered, areBankFieldsLoaded, getBankFieldDisplayValue, getBankFieldRuleError, isAccountHolderField, isBankFieldAnswered, splitBankFields};
export type {SplitBankFields};
