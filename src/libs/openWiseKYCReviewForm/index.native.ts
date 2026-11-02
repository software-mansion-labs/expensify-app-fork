import Log from '@libs/Log';

import {openBrowserAsync} from 'expo-web-browser';

import type OpenWiseKYCReviewForm from './types';

/** Opens Wise's hosted KYC form in an in-app browser over the app, so closing it leaves the user on the page that opened it */
const openWiseKYCReviewForm: OpenWiseKYCReviewForm = (url) => {
    openBrowserAsync(url).catch((error: unknown) => {
        // The URL is left out of the log, since it carries a token
        Log.hmmm('[Wise] Could not open the KYC review form', {error: error instanceof Error ? error.message : String(error)});
    });
};

export default openWiseKYCReviewForm;
