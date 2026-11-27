/**
 * A read that a page needs before it can show anything. It is sent when the page opens and again after each reconnect
 * until it succeeds. It is tracked under its request key the way every other request of a flow is.
 */
import useNetwork from '@hooks/useNetwork';

import {getIsOffline} from '@libs/NetworkState';

import {useFlowData} from '@pages/SimplifiedBankOnboarding/core/flow/flowData';

import {useEffect, useEffectEvent, useRef} from 'react';

import type {OnboardingRequest, RequestOutcome} from './types';

import {getRequestKey, sendTrackedRequest, useRequestKeyState} from './runRequest';

/**
 * Sends the read on mount while `isEnabled` is true, when `isEnabled` turns true, and again after each reconnect until
 * the read of this page succeeds. It is never sent while offline. The status of the key does not say whether this page
 * has read: another page may use the same key with other params (the bank fields of another country), so a read that
 * this page skipped offline is sent after the reconnect also while the read of that other page is pending or succeeded.
 * The request is built from the data of the last render, because an effect must not read Onyx on its own. Works only
 * inside OnboardingFlow.
 */
function useReadOnOpen(request: OnboardingRequest, {isEnabled = true}: {isEnabled?: boolean} = {}): {isPending: boolean; hasFailed: boolean} {
    const data = useFlowData();
    const key = getRequestKey(request.name, data.bankAccount);
    const {status} = useRequestKeyState(key);

    /** The read that this page sent last, while it is pending or after it succeeded. Empty when the page still owes a read. */
    const ownReadRef = useRef<Promise<RequestOutcome> | undefined>(undefined);

    function read() {
        if (getIsOffline()) {
            ownReadRef.current = undefined;
            return;
        }
        const ownRead = sendTrackedRequest(key, request.build(data));
        ownReadRef.current = ownRead;

        ownRead.then((outcome) => {
            // A newer read of this page replaced this one, so only the newer one says whether the page still owes a read
            if (ownReadRef.current !== ownRead || outcome.status === 'succeeded') {
                return;
            }
            ownReadRef.current = undefined;
        });
    }

    const readOnOpen = useEffectEvent(read);
    useEffect(() => {
        if (!isEnabled) {
            return;
        }
        readOnOpen();
    }, [isEnabled]);

    useNetwork({
        onReconnect: () => {
            if (!isEnabled || ownReadRef.current) {
                return;
            }
            read();
        },
    });

    return {isPending: status === 'pending', hasFailed: status === 'failed'};
}

export default useReadOnOpen;
