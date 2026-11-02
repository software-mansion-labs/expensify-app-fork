import type Platform from '@libs/getPlatform/types';

type GetWiseKYCReviewEmbeddedLinkParams = {
    bankAccountID: number;

    /** Picks where Wise sends the user back: the web page, or the app's scheme on mobile */
    platform: Platform;
};

export default GetWiseKYCReviewEmbeddedLinkParams;
