import openExternalLink from '@libs/openExternalLink';

import type OpenWiseKYCReviewForm from './types';

/** Opens Wise's hosted KYC form in place of the app, so Wise's redirect brings the user back to the tab they left */
const openWiseKYCReviewForm: OpenWiseKYCReviewForm = (url) => {
    openExternalLink(url, undefined, true);
};

export default openWiseKYCReviewForm;
