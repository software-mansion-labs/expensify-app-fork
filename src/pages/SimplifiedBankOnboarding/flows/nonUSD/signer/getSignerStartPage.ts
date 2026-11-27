/**
 * The page that the signer step opens on every way in, read from the saved signer data: the waiting page once the step
 * invited the directors it had to invite, else the director question.
 */
import {requiresSecondDirector} from '@pages/SimplifiedBankOnboarding/contract/currency';
import type {CorpayData} from '@pages/SimplifiedBankOnboarding/contract/onyx';

import type {OnyxEntry} from 'react-native-onyx';

import PAGES from './signerPages';

type SignerStartPage = typeof PAGES.IS_DIRECTOR | typeof PAGES.HANG_TIGHT;

function getSignerStartPage(corpay: OnyxEntry<CorpayData>, currency: string | undefined): SignerStartPage {
    if (requiresSecondDirector(currency)) {
        const hasInvitedDirector = corpay?.signerEmail !== undefined || corpay?.secondSignerEmail !== undefined;
        return hasInvitedDirector ? PAGES.HANG_TIGHT : PAGES.IS_DIRECTOR;
    }

    // Once the server holds the name of the one director, nobody is left to wait for, even when an email was saved before.
    const isWaitingForDirector = corpay?.signerEmail !== undefined && corpay.signerFullName === undefined;
    return isWaitingForDirector ? PAGES.HANG_TIGHT : PAGES.IS_DIRECTOR;
}

export default getSignerStartPage;
