import Log from '@libs/Log';

import CONST from '@src/CONST';

import {openAuthSessionAsync} from 'expo-web-browser';

/**
 * Opens Wise's hosted KYC form in an in-app browser. Wise's redirect to our scheme closes it when the form ends.
 * The outcome comes through Onyx from Wise's webhook, so the redirect URL carries nothing to read.
 */
function openWiseKYCReviewForm(url: string) {
    // An ephemeral session skips iOS's "wants to use ... to sign in" prompt, which would mislead here, and the link's token needs no cookies.
    openAuthSessionAsync(url, CONST.WISE.NATIVE_KYC_REVIEW_REDIRECT_URL, {preferEphemeralSession: true}).catch((error: unknown) => {
        Log.hmmm('[Wise] Could not open the KYC review form', {error: error instanceof Error ? error.message : String(error)});
    });
}

export default openWiseKYCReviewForm;
