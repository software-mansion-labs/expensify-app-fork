import isAppLinkHostname from '@libs/Navigation/linkingConfig/isAppLinkHostname';

import 'react-native-url-polyfill/auto';

/**
 * PDF annotations are untrusted and must not launch custom schemes or navigate back into the app.
 */
function isAllowedPDFLink(url: string): boolean {
    try {
        const {protocol, hostname} = new URL(url);
        const normalizedProtocol = protocol.toLowerCase();
        if (normalizedProtocol !== 'https:' && normalizedProtocol !== 'http:') {
            return false;
        }

        return !isAppLinkHostname(hostname);
    } catch {
        return false;
    }
}

export default isAllowedPDFLink;
