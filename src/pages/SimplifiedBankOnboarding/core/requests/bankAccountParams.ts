import type {ACHData} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import type {BankAccountParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import type {OnyxEntry} from 'react-native-onyx';

/** The ID that requests send until the server created the bank account */
const NO_BANK_ACCOUNT_ID = 0;

/**
 * The params that name the bank account in a request. The fallback ID is for callers that know the ID from another
 * place, such as the route of the invited director or the summary on the workspace.
 */
function getBankAccountParams(policyID: string | undefined, achData: OnyxEntry<ACHData>, fallbackBankAccountID: number = NO_BANK_ACCOUNT_ID): BankAccountParams {
    return {policyID, bankAccountID: achData?.bankAccountID ?? fallbackBankAccountID};
}

export {getBankAccountParams, NO_BANK_ACCOUNT_ID};
