import {getIsOffline, subscribe} from '@libs/NetworkState';

import {fromCallback} from 'xstate';

import type {MfaEvent} from './types';

/**
 * Reports the network status to the machine's `network` region, which starts `online`. `NetworkState`
 * notifies on every update, not only on a change, so only an actual flip is sent.
 */
const watchNetwork = fromCallback(({sendBack}) => {
    let isOffline = false;
    const reportChange = () => {
        const nextIsOffline = getIsOffline();
        if (nextIsOffline === isOffline) {
            return;
        }
        isOffline = nextIsOffline;
        sendBack({type: isOffline ? 'NETWORK_OFFLINE' : 'NETWORK_ONLINE'} satisfies MfaEvent);
    };
    reportChange();
    return subscribe(reportChange);
});

export default watchNetwork;
