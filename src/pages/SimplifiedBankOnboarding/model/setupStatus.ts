/**
 * Checks on the server data of the bank account in one vocabulary. The entry page, the plan builders and the frozen landing
 * page ask these questions instead of comparing `achData` fields themselves.
 */
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {ACHData} from '@pages/SimplifiedBankOnboarding/types/onyx';

/** The account key is shared by every workspace, so its data only describes a workspace when it carries that policy ID */
function belongsToPolicy(achData: ACHData | undefined, policyID: string | undefined): boolean {
    return !!policyID && achData?.policyID === policyID;
}

/** A USD account is connected once the server moved it to the last step, a NonUSD one once the review opened it */
function isConnected(achData: ACHData | undefined, isNonUSD: boolean): boolean {
    if (isNonUSD) {
        return achData?.state === SBO_CONST.STATE.OPEN;
    }
    return achData?.currentStep === SBO_CONST.USD.STEP.ENABLE;
}

/** The account waits for the test deposit amounts */
function isPendingValidation(achData: ACHData | undefined): boolean {
    return achData?.state === SBO_CONST.STATE.PENDING;
}

/** The setup was sent and waits for the review of the server */
function isVerifying(achData: ACHData | undefined): boolean {
    return achData?.state === SBO_CONST.STATE.VERIFYING;
}

/** The NonUSD account exists once the bank step was saved */
function isGlobalAccountCreated(achData: ACHData | undefined): boolean {
    return !!achData?.created;
}

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

/** Once the server checked the company it no longer accepts a new name or tax ID */
function areCompanyDetailsLocked(achData: ACHData | undefined): boolean {
    const state = achData?.state;
    return !!achData?.bankAccountID && !!achData.companyName && state !== SBO_CONST.STATE.SETUP && state !== SBO_CONST.STATE.VERIFYING;
}

function isSupportedCurrency(currency: string | undefined): boolean {
    return SBO_CONST.SUPPORTED_CURRENCIES.some((supportedCurrency) => supportedCurrency === currency);
}

function isNonUSDCurrency(currency: string | undefined): boolean {
    return !!currency && currency !== SBO_CONST.CURRENCY.USD;
}

/** Only some currencies need the extra step that collects a signed authorization form */
function requiresDocusignStep(currency: string | undefined): boolean {
    return currency === SBO_CONST.CURRENCY.AUD;
}

export {
    areCompanyDetailsLocked,
    belongsToPolicy,
    hasInProgressNonUSDSetup,
    hasInProgressSetup,
    hasInProgressUSDSetup,
    isConnected,
    isGlobalAccountCreated,
    isNonUSDCurrency,
    isPendingValidation,
    isSupportedCurrency,
    isVerifying,
    requiresDocusignStep,
};
