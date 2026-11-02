import openExternalLink from '@libs/openExternalLink';

/** Opens Wise's hosted KYC form. On web it replaces the app tab, and Wise redirects back to the app when the form ends. */
function openWiseKYCReviewForm(url: string) {
    openExternalLink(url, undefined, true);
}

export default openWiseKYCReviewForm;
