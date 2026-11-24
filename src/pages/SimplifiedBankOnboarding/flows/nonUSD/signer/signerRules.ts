/**
 * The rules of the signer step that depend on the answers: whether the user still has to give a name, which name the
 * director request sends, and which emails the step asks for. The answers are read draft first, so a changed owner
 * answer of the earlier step wins over the saved one (README scenario 6).
 */
import {requiresSecondDirector} from '@pages/SimplifiedBankOnboarding/contract/currency';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import type {NonUSDAnswers} from '@pages/SimplifiedBankOnboarding/flows/nonUSD/nonUSDAnswers';

/**
 * The inputs of the email page. `two`: an AUD user who is not a director names both directors. `secondOnly`: an AUD
 * director names the second one. `one`: any other currency names the one director.
 */
type SignerEmailMode = 'two' | 'secondOnly' | 'one';

type SignerAnswers = Pick<NonUSDAnswers, 'ownsMoreThan25Percent' | 'owners' | 'signerFullName'>;

/** The full name of the user's own owner entry, or undefined when the user is not an owner or the entry has no name */
function getOwnerNameOfUser({ownsMoreThan25Percent, owners}: SignerAnswers): string | undefined {
    if (!ownsMoreThan25Percent) {
        return undefined;
    }
    const userOwner = owners.find((owner) => owner.id === SBO_CONST.NON_USD.CURRENT_USER_KEY);
    const fullName = userOwner ? `${userOwner.firstName} ${userOwner.lastName}`.trim() : '';
    return fullName || undefined;
}

/** False when the owners step already holds the user's name, so the name page is left out */
function shouldAskForSignerName(answers: SignerAnswers): boolean {
    return getOwnerNameOfUser(answers) === undefined;
}

/** The name of the user as a director: the name of the user's owner entry when there is one, else the signer name */
function getSignerFullName(answers: SignerAnswers): string {
    return getOwnerNameOfUser(answers) ?? answers.signerFullName;
}

function getSignerEmailMode(isUserDirector: boolean | undefined, currency: string): SignerEmailMode {
    if (!requiresSecondDirector(currency)) {
        return 'one';
    }
    return isUserDirector ? 'secondOnly' : 'two';
}

export {getSignerEmailMode, getSignerFullName, shouldAskForSignerName};
export type {SignerEmailMode};
