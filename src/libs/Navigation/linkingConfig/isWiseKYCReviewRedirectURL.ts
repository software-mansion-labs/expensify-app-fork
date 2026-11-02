import CONST from '@src/CONST';

import getPathnameFromURL from './getPathnameFromURL';

/** Matches Wise's redirect out of its KYC form on mobile. The in-app browser that opened the form consumes it, so it must not be routed. */
function isWiseKYCReviewRedirectURL(url: string): boolean {
    return getPathnameFromURL(url) === CONST.WISE.NATIVE_KYC_REVIEW_REDIRECT_URL;
}

export default isWiseKYCReviewRedirectURL;
