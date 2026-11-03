/** Reads how Wise's hosted KYC form ended from the https redirect that closes it */
import isAppLinkHostname from '@libs/Navigation/linkingConfig/isAppLinkHostname';

import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';

import 'react-native-url-polyfill/auto';

import type EmbeddedFlowOutcome from './types';

function parseURL(url: string): URL | undefined {
    try {
        return new URL(url);
    } catch {
        return undefined;
    }
}

/**
 * Reads how Wise's hosted form ended from its last step, an https redirect to the app's KYC complete page.
 * Any other URL gives nothing, so the form keeps going.
 */
function getEmbeddedFlowOutcomeFromRedirect(url: string): EmbeddedFlowOutcome | undefined {
    const parsedURL = parseURL(url);
    if (parsedURL?.protocol !== 'https:' || !isAppLinkHostname(parsedURL.hostname) || parsedURL.pathname !== `/${ROUTES.WISE_KYC_COMPLETE}`) {
        return undefined;
    }
    const status = parsedURL.searchParams.get(CONST.WISE.EMBEDDED_FLOW.REDIRECT_STATUS_PARAM);
    if (status === CONST.WISE.EMBEDDED_FLOW.REDIRECT_STATUS.SUCCESS) {
        return 'done';
    }
    return status === CONST.WISE.EMBEDDED_FLOW.REDIRECT_STATUS.CANCELLED ? 'cancelled' : 'failed';
}

export default getEmbeddedFlowOutcomeFromRedirect;
