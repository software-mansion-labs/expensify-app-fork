/**
 * A read that a page needs before it can show anything. It is sent when the page opens and again after each reconnect
 * until it succeeds. It is built and sent the way every other request of a flow is.
 */
import useNetwork from '@hooks/useNetwork';

import {getIsOffline} from '@libs/NetworkState';

import {useOnboardingFlow} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';

import {useEffect, useEffectEvent, useRef} from 'react';

import type {OnboardingRequest} from './types';

import {getRequestKey, useRequestKeyState} from './runRequest';
import {useBackgroundRequest} from './useOnboardingRequest';

/**
 * Sends the read on mount while `isEnabled` is true, when `isEnabled` turns true, and again after each reconnect until
 * it succeeds. It is never sent while offline, and a read skipped offline is sent after the reconnect even when the key
 * still holds a success of an earlier read, because that read could have used other params. Works only inside
 * OnboardingFlow.
 */
function useReadOnOpen(request: OnboardingRequest, {isEnabled = true}: {isEnabled?: boolean} = {}): {isPending: boolean; hasFailed: boolean} {
    const {bankAccount} = useOnboardingFlow();
    const sendRead = useBackgroundRequest(request);
    const key = getRequestKey(request.name, bankAccount);
    const {status} = useRequestKeyState(key);
    const hasSkippedReadRef = useRef(false);

    async function read() {
        if (getIsOffline()) {
            hasSkippedReadRef.current = true;
            return;
        }
        const outcome = await sendRead();
        hasSkippedReadRef.current = outcome.status === 'skipped';
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
            const hasReadSucceeded = status === 'succeeded' && !hasSkippedReadRef.current;
            if (!isEnabled || status === 'pending' || hasReadSucceeded) {
                return;
            }
            read();
        },
    });

    return {isPending: status === 'pending', hasFailed: status === 'failed'};
}

export default useReadOnOpen;
