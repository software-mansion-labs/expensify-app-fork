/**
 * Pure checks on the server data of the bank account, in one vocabulary. The entry, the flows and the lab ask these
 * questions instead of comparing `achData` fields themselves.
 */
import type {OnyxEntry} from 'react-native-onyx';

import type {ACHData, CorpayData} from './onyx';

import {requiresSecondDirector} from './currency';
import SBO_CONST from './SBO_CONST';

/** The account key is shared by every workspace, so its data only describes a workspace when it carries that policy ID */
function belongsToPolicy(achData: OnyxEntry<ACHData>, policyID: string | undefined): boolean {
    return !!policyID && achData?.policyID === policyID;
}

/** A USD account is connected once the server moved it to the last step, a NonUSD one once the review opened it */
function isConnected(achData: OnyxEntry<ACHData>, isNonUSD: boolean): boolean {
    if (isNonUSD) {
        return achData?.state === SBO_CONST.STATE.OPEN;
    }
    return achData?.currentStep === SBO_CONST.USD.STEP.ENABLE;
}

/** The account waits for the test deposit amounts */
function isPendingValidation(achData: OnyxEntry<ACHData>): boolean {
    return achData?.state === SBO_CONST.STATE.PENDING;
}

/** The setup was sent and waits for the review of the server */
function isVerifying(achData: OnyxEntry<ACHData>): boolean {
    return achData?.state === SBO_CONST.STATE.VERIFYING;
}

/** The NonUSD account exists once the bank step was saved */
function isGlobalAccountCreated(achData: OnyxEntry<ACHData>): boolean {
    return achData?.created !== undefined;
}

/** The server created a bank account for this setup (a USD account exists once the bank account step was saved) */
function hasBankAccount(achData: OnyxEntry<ACHData>): boolean {
    return !!achData?.bankAccountID;
}

/** A USD bank account exists on the server and is not connected yet */
function hasInProgressUSDSetup(achData: OnyxEntry<ACHData>): boolean {
    return !!achData?.bankAccountID && !!achData.state && achData.state !== SBO_CONST.STATE.OPEN;
}

/** The user passed the bank step of the NonUSD flow, which is the step that creates the account */
function hasInProgressNonUSDSetup(achData: OnyxEntry<ACHData>): boolean {
    return !!achData?.bankAccountID && !!achData.created;
}

/** Without a workspace ID the account data is taken as it is, which is the case of a page opened by the bank account ID */
function hasInProgressSetup(achData: OnyxEntry<ACHData>, isNonUSD: boolean, policyID: string | undefined): boolean {
    if (policyID && achData?.policyID !== policyID) {
        return false;
    }
    return isNonUSD ? hasInProgressNonUSDSetup(achData) : hasInProgressUSDSetup(achData);
}

/**
 * Once the server checked the company it no longer accepts a new name or tax ID. The server saves both in one request,
 * so a saved company name means a saved tax ID.
 */
function areCompanyDetailsLocked(achData: OnyxEntry<ACHData>): boolean {
    const state = achData?.state;
    return !!achData?.bankAccountID && !!achData.companyName && state !== SBO_CONST.STATE.SETUP && state !== SBO_CONST.STATE.VERIFYING;
}

/** Every director that the currency needs has given their name */
function areSignersKnown(corpay: OnyxEntry<CorpayData>, currency: string): boolean {
    if (!corpay?.signerFullName) {
        return false;
    }
    return !requiresSecondDirector(currency) || !!corpay.secondSignerFullName;
}

export {areCompanyDetailsLocked, areSignersKnown, belongsToPolicy, hasBankAccount, hasInProgressSetup, isConnected, isGlobalAccountCreated, isPendingValidation, isVerifying};
