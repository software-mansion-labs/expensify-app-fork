/**
 * The rules of the signer step: whether the saved data says that the step is done, and the rules that depend on the
 * answers, which are whether the user still has to give a name, which name the director request sends, and which emails
 * the step asks for. The answers are read draft first, so a changed owner answer of the earlier step wins over the
 * saved one (README scenario 6).
 */
import {requiresSecondDirector} from '@pages/SimplifiedBankOnboarding/contract/currency';
import {areSignersKnown, isVerifying} from '@pages/SimplifiedBankOnboarding/contract/setupStatus';
import type {FlowData} from '@pages/SimplifiedBankOnboarding/core';
import getOwnersAnswers from '@pages/SimplifiedBankOnboarding/flows/nonUSD/beneficialOwners/getOwnersAnswers';
import {CURRENT_USER_OWNER_ID, findOwner} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/ownerList';
import {getOwnerFullName} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/serverOwners';

import getSignerAnswers from './getSignerAnswers';

/**
 * The inputs of the email page. `two`: an AUD user who is not a director names both directors. `secondOnly`: an AUD
 * director names the second one. `one`: any other currency names the one director.
 */
type SignerEmailMode = 'two' | 'secondOnly' | 'one';

/** The step is done once every director is known and the agreements were not sent yet, or once the setup was sent */
function isSignerStepComplete({account, currency}: FlowData): boolean {
    const achData = account?.achData;
    if (isVerifying(achData)) {
        return true;
    }
    return areSignersKnown(achData?.corpay, currency) && achData?.corpay?.authorizedToBindClientToAgreement === undefined;
}

/** The full name of the user's own owner entry, or undefined when the user is not an owner or the entry has no name */
function getOwnerNameOfUser(data: FlowData): string | undefined {
    const {ownsMoreThan25Percent, owners} = getOwnersAnswers(data);
    if (!ownsMoreThan25Percent) {
        return undefined;
    }
    const userOwner = findOwner(owners, CURRENT_USER_OWNER_ID);
    return (userOwner && getOwnerFullName(userOwner)) || undefined;
}

/** False when the owners step already holds the user's name, so the name page is left out */
function shouldAskForSignerName(data: FlowData): boolean {
    return getOwnerNameOfUser(data) === undefined;
}

/** The name of the user as a director: the name of the user's owner entry when there is one, else the signer name */
function getSignerFullName(data: FlowData): string {
    return getOwnerNameOfUser(data) ?? getSignerAnswers(data).signerFullName;
}

function getSignerEmailMode(isUserDirector: boolean | undefined, currency: string | undefined): SignerEmailMode {
    if (!requiresSecondDirector(currency)) {
        return 'one';
    }
    return isUserDirector ? 'secondOnly' : 'two';
}

export {getSignerEmailMode, getSignerFullName, isSignerStepComplete, shouldAskForSignerName};
export type {SignerEmailMode};
