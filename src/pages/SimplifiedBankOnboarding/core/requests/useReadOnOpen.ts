/**
 * A read that a page needs before it can show anything. It is sent when the page opens and again after each reconnect
 * until it succeeds. The data of the flow comes from subscriptions, because the read starts in an effect.
 */
import useNetwork from '@hooks/useNetwork';

import {getIsOffline} from '@libs/NetworkState';

import {useOnboardingFlow} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';
import {useFlowData} from '@pages/SimplifiedBankOnboarding/core/flow/flowData';

import {useEffect, useEffectEvent} from 'react';

import type {OnboardingRequest} from './types';

import {failUnsentRequest, getRequestKey, sendTrackedRequest, useRequestKeyState} from './runRequest';

/**
 * Sends the read on mount while `isEnabled` is true, when `isEnabled` turns true, and again after each reconnect until
 * it succeeds. It is never sent while offline. Works only inside OnboardingFlow.
 */
function useReadOnOpen(request: OnboardingRequest, {isEnabled = true}: {isEnabled?: boolean} = {}): {isPending: boolean; hasFailed: boolean} {
    const {bankAccount} = useOnboardingFlow();
    const data = useFlowData();
    const key = getRequestKey(request.name, bankAccount);
    const {status} = useRequestKeyState(key);
    const shouldReadAfterReconnect = isEnabled && status !== 'succeeded' && status !== 'pending';

    function read() {
        if (getIsOffline()) {
            return;
        }
        const spec = request.build(data);
        if (!spec) {
            failUnsentRequest(key, {});
            return;
        }
        sendTrackedRequest(key, spec);
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
            if (!shouldReadAfterReconnect) {
                return;
            }
            read();
        },
    });

    return {isPending: status === 'pending', hasFailed: status === 'failed'};
}

export default useReadOnOpen;
