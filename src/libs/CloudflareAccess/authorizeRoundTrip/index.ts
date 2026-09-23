import {savePendingAuthFlow} from '@libs/CloudflareAccess/PendingAuthFlowStorage';

import type {RunAuthorizeRoundTrip} from './types';

const runAuthorizeRoundTrip: RunAuthorizeRoundTrip = ({authorizeURL, state, codeVerifier, returnURL = window.location.href}) => {
    // Parked outside module memory, which the navigation below destroys
    savePendingAuthFlow({state, codeVerifier, returnURL, createdAt: Date.now()});
    window.location.assign(authorizeURL);
    return new Promise<never>(() => {});
};

export default runAuthorizeRoundTrip;
