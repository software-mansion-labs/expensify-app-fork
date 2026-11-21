/**
 * Splits the bank inputs that the server describes in the NonUSD flow into the two pages of the bank step. The only
 * thing that tells the two groups apart is the prefix of the input ID.
 */
import type {BankFields, BankFormField} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';

import type {OnyxEntry} from 'react-native-onyx';

function isAccountHolderField(field: BankFormField): boolean {
    return field.id.startsWith(SBO_CONST.NON_USD.ACCOUNT_HOLDER_KEY_PREFIX);
}

function getBankAccountDetailsFields(bankFields: OnyxEntry<BankFields>): BankFormField[] {
    return (bankFields?.formFields ?? []).filter((field) => !isAccountHolderField(field));
}

function getAccountHolderDetailsFields(bankFields: OnyxEntry<BankFields>): BankFormField[] {
    return (bankFields?.formFields ?? []).filter(isAccountHolderField);
}

export {getAccountHolderDetailsFields, getBankAccountDetailsFields, isAccountHolderField};
