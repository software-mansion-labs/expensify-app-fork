import type {BankFields} from '@pages/SimplifiedBankOnboarding/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

/** The key keeps the inputs of the last country that was read, so they only describe the bank step of the same country and currency */
function areBankFieldsLoaded(bankFields: OnyxEntry<BankFields>, country: string, currency: string): boolean {
    return !!country && bankFields?.bankCountry === country && bankFields.bankCurrency === currency && bankFields.formFields !== undefined;
}

export default areBankFieldsLoaded;
