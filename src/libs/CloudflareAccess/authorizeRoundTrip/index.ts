import {savePendingAuthFlow} from '@libs/CloudflareAccess/PendingAuthFlowStorage';

import type {RunAuthorizeRoundTrip} from './types';

const runAuthorizeRoundTrip: RunAuthorizeRoundTrip = ({authorizeURL, state, codeVerifier, returnURL = window.location.href}) => {
    // Must be stored before the navigation. Module memory does not survive the unload
    savePendingAuthFlow({state, codeVerifier, returnURL, createdAt: Date.now()});
    window.location.assign(authorizeURL);

    // Only a Back that restores this page from the back/forward cache settles it; every other path unloads it
    return new Promise((resolve) => {
        window.addEventListener('pageshow', () => resolve({outcome: 'cancelled'}), {once: true});
    });
};

export default runAuthorizeRoundTrip;
