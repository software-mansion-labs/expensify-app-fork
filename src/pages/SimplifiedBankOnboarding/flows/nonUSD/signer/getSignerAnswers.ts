/** The answers of the NonUSD signer step: the draft value, then the one that the global provider saved (BC-08) */
import type {CorpayData} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import type {FlowData} from '@pages/SimplifiedBankOnboarding/core';

import type {OnyxEntry} from 'react-native-onyx';

type SignerAnswers = {
    /** Undefined until the user answered the question or the server saved a director */
    isUserDirector: boolean | undefined;
    signerFullName: string;
    signerJobTitle: string;
};

/** A saved full name means the user is the director. A saved email without a name means the user invited one. */
function getSavedDirectorAnswer(corpay: OnyxEntry<CorpayData>): boolean | undefined {
    if (corpay?.signerFullName) {
        return true;
    }
    return corpay?.signerEmail ? false : undefined;
}

function getSignerAnswers({draft, account}: FlowData): SignerAnswers {
    const corpay = account?.achData?.corpay;

    return {
        isUserDirector: draft.isUserDirector ?? getSavedDirectorAnswer(corpay),
        signerFullName: draft.signerFullName ?? corpay?.signerFullName ?? '',
        signerJobTitle: draft.signerJobTitle ?? corpay?.signerJobTitle ?? '',
    };
}

export default getSignerAnswers;
