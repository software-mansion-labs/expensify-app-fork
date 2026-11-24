/** The last digits of a bank account number, which the entry shows instead of the whole number */
import type {ACHData} from '@pages/SimplifiedBankOnboarding/contract/onyx';

import type {OnyxEntry} from 'react-native-onyx';

const ACCOUNT_ENDING_LENGTH = 4;

/** The two flows keep the account number in different places, so the USD number comes first, then the IBAN, then the Corpay number. '' when none. */
function getAccountEnding(achData: OnyxEntry<ACHData>): string {
    const accountNumber = achData?.accountNumber ?? achData?.corpay?.iban ?? achData?.corpay?.accountNumber ?? '';
    return accountNumber.slice(-ACCOUNT_ENDING_LENGTH);
}

export default getAccountEnding;
export {ACCOUNT_ENDING_LENGTH};
