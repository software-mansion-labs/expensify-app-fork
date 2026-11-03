import Navigation from '@libs/Navigation/Navigation';

import ROUTES from '@src/ROUTES';

import type OpenWiseKYCReviewForm from './types';

/**
 * Opens Wise's hosted KYC form in a WebView screen. The screen reads the link from Onyx rather than from the route,
 * since the link carries a token that must not end up in the navigation state.
 */
const openWiseKYCReviewForm: OpenWiseKYCReviewForm = () => {
    Navigation.navigate(ROUTES.SETTINGS_WALLET_WISE_KYC_REVIEW_FORM);
};

export default openWiseKYCReviewForm;
