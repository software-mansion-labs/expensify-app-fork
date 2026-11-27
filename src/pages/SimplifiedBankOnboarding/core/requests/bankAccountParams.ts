import type {ACHData} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import type {BankAccountParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import CONST from '@src/CONST';

import type {OnyxEntry} from 'react-native-onyx';

/**
 * The params that name the bank account in a request. The fallback ID is for callers that know the ID from another
 * place, such as the route of the invited director or the summary on the workspace.
 */
function getBankAccountParams(policyID: string | undefined, achData: OnyxEntry<ACHData>, fallbackBankAccountID: number = CONST.DEFAULT_NUMBER_ID): BankAccountParams {
    return {policyID, bankAccountID: achData?.bankAccountID ?? fallbackBankAccountID};
}

export default getBankAccountParams;
