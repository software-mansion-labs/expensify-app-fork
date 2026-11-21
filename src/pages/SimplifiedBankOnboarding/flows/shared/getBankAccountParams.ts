import type {ACHData} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import type {BankAccountParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

const NO_BANK_ACCOUNT_ID = 0;

/**
 * Builds the parameters that identify the bank account in a request. The ID is 0 until the server created the account.
 * The fallback ID is for callers that also know the ID from another place, such as the summary on the workspace.
 */
function getBankAccountParams(policyID: string | undefined, achData: ACHData | undefined, fallbackBankAccountID: number = NO_BANK_ACCOUNT_ID): BankAccountParams {
    return {policyID, bankAccountID: achData?.bankAccountID ?? fallbackBankAccountID};
}

export default getBankAccountParams;
