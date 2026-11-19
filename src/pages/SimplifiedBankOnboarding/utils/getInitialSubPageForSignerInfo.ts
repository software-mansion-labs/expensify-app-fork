/**
 * Decides which sub page of the signer step opens first, from what the server already knows about the directors.
 */
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {CorpayData} from '@pages/SimplifiedBankOnboarding/types/onyx';

const {IS_DIRECTOR, HANG_TIGHT} = SBO_CONST.NON_USD.SIGNER_INFO_SUB_PAGES;

function getInitialSubPageForSignerInfo(corpay: CorpayData | undefined, currency: string | undefined): string {
    if (currency === SBO_CONST.CURRENCY.AUD) {
        return corpay?.signerEmail === undefined && corpay?.secondSignerEmail === undefined ? IS_DIRECTOR : HANG_TIGHT;
    }
    return corpay?.signerEmail === undefined || corpay.signerFullName !== undefined ? IS_DIRECTOR : HANG_TIGHT;
}

export default getInitialSubPageForSignerInfo;
