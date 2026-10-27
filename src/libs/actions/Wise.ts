import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

const MOCK_RESPONSE_DELAY_MS = 1000;

/** Fetches a fresh link to Wise's embedded KYC page for the bank account into `wiseKYCReviewEmbeddedLink` */
function getWiseKYCReviewEmbeddedLink(bankAccountID: number) {
    Onyx.set(ONYXKEYS.RAM_ONLY_WISE_KYC_REVIEW_EMBEDDED_LINK, {isLoading: true});

    // TODO: Call GetWiseKYCReviewEmbeddedLink once Auth ships it (https://github.com/Expensify/Expensify/issues/690547). Until then a fake link arrives after a delay.
    setTimeout(() => {
        Onyx.set(ONYXKEYS.RAM_ONLY_WISE_KYC_REVIEW_EMBEDDED_LINK, {
            url: `https://sandbox.transferwise.tech/kyc-review?bankAccountID=${bankAccountID}`,
            isLoading: false,
        });
    }, MOCK_RESPONSE_DELAY_MS);
}

/** Drops the link, which carries a token */
function clearWiseKYCReviewEmbeddedLink() {
    Onyx.set(ONYXKEYS.RAM_ONLY_WISE_KYC_REVIEW_EMBEDDED_LINK, null);
}

export {clearWiseKYCReviewEmbeddedLink, getWiseKYCReviewEmbeddedLink};
