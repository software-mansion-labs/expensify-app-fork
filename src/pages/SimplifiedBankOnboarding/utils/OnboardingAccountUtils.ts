/**
 * Small checks on the account data that several screens share. They mirror `libs/ReimbursementAccountUtils`.
 */
import type {BankAccountParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {ACHData} from '@pages/SimplifiedBankOnboarding/types/onyx';

const NO_BANK_ACCOUNT_ID = 0;

/** Returns true when a USD bank account exists on the server and is not connected yet */
function hasInProgressUSDSetup(achData?: ACHData): boolean {
    return !!achData?.bankAccountID && !!achData.state && achData.state !== SBO_CONST.STATE.OPEN;
}

/** Returns true when the user passed the bank step of the NonUSD flow, which is the step that creates the account */
function hasInProgressNonUSDSetup(achData?: ACHData): boolean {
    return !!achData?.bankAccountID && !!achData.created;
}

/** Without a workspace ID the account data is taken as it is, which is the case of a page opened by the bank account ID */
function hasInProgressSetup(achData: ACHData | undefined, isNonUSDWorkspace: boolean, policyID: string | undefined): boolean {
    if (policyID && achData?.policyID !== policyID) {
        return false;
    }
    return isNonUSDWorkspace ? hasInProgressNonUSDSetup(achData) : hasInProgressUSDSetup(achData);
}

/**
 * Builds the parameters that identify the bank account in a request. The ID is 0 until the server created the account.
 * The fallback ID is for callers that also know the ID from another place, such as the summary on the workspace.
 */
function getBankAccountParams(policyID: string | undefined, achData: ACHData | undefined, fallbackBankAccountID: number = NO_BANK_ACCOUNT_ID): BankAccountParams {
    return {policyID, bankAccountID: achData?.bankAccountID ?? fallbackBankAccountID};
}

/** Returns true once the server holds the account past the review, when the saved company name and tax ID stay as they are */
function isAccountPastReview(achData: ACHData | undefined): boolean {
    const state = achData?.state;
    return !!achData?.bankAccountID && state !== SBO_CONST.STATE.SETUP && state !== SBO_CONST.STATE.VERIFYING;
}

function isSupportedCurrency(currency: string | undefined): boolean {
    return SBO_CONST.SUPPORTED_CURRENCIES.some((supportedCurrency) => supportedCurrency === currency);
}

/** Only some currencies need the extra step that collects a signed authorization form */
function requiresDocusignStep(currency: string | undefined): boolean {
    return currency === SBO_CONST.CURRENCY.AUD;
}

export {getBankAccountParams, hasInProgressNonUSDSetup, hasInProgressSetup, hasInProgressUSDSetup, isAccountPastReview, isSupportedCurrency, requiresDocusignStep};
