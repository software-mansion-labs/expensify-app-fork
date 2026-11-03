import openExternalLink from '@libs/openExternalLink';

import type OpenWiseKYCReviewForm from './types';

/** Opens Wise's hosted KYC form. On web it replaces the app tab, and Wise redirects back to the app when the form ends. */
const openWiseKYCReviewForm: OpenWiseKYCReviewForm = (url) => {
    openExternalLink(url, undefined, true);
};

export default openWiseKYCReviewForm;
