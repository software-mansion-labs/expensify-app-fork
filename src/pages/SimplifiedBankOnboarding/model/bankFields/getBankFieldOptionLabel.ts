import type {BankFormField} from '@pages/SimplifiedBankOnboarding/types/onyx';

/** A picklist value is shown by the text the server gave it, any other value as it is */
function getBankFieldOptionLabel(field: BankFormField, value: string): string {
    return field.valueSet?.find((option) => option.id === value)?.text ?? value;
}

export default getBankFieldOptionLabel;
