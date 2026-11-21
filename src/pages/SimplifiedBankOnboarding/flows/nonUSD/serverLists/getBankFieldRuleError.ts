import type {BankFormField} from '@pages/SimplifiedBankOnboarding/contract/onyx';

/** Returns the message of the first rule that the value breaks. The messages are server strings, not translation keys. */
function getBankFieldRuleError(field: BankFormField, value: string): string | undefined {
    return field.validationRules.find((rule) => !!rule.regEx && !new RegExp(rule.regEx).test(value))?.errorMessage;
}

export default getBankFieldRuleError;
