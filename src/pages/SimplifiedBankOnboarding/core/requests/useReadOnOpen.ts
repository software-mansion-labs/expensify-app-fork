/**
 * A read that a page needs before it can show anything. It is sent when the page opens and again after each reconnect
 * until it succeeds. The saved data comes from subscriptions, because the read starts in an effect.
 */
import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';

import {getIsOffline} from '@libs/NetworkState';

import {useOnboardingFlow} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';

import ONYXKEYS from '@src/ONYXKEYS';

import {useEffect, useEffectEvent} from 'react';

import type {OnboardingRequest} from './types';

import {failUnsentRequest, getRequestKey, sendTrackedRequest, useRequestKeyState} from './runRequest';
import {getSavedOnboardingData} from './useOnboardingRequest';

/**
 * The one reconnect rule of the reads of the lab: after a reconnect, read again while `shouldRead` says the last read
 * did not succeed. Shared by useReadOnOpen and useAccountRead. Internal to core.
 */
function useReadAgainOnReconnect(read: () => void, shouldRead: boolean) {
    useNetwork({
        onReconnect: () => {
            if (!shouldRead) {
                return;
            }
            read();
        },
    });
}

/**
 * Sends the read on mount while `isEnabled` is true, when `isEnabled` turns true, and again after each reconnect until
 * it succeeds. It is never sent while offline. Works only inside OnboardingFlow.
 */
function useReadOnOpen(request: OnboardingRequest, {isEnabled = true}: {isEnabled?: boolean} = {}): {isPending: boolean; hasFailed: boolean} {
    const {target, formID, bankAccount} = useOnboardingFlow();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [mainDraft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);
    const [signerDraft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM_DRAFT);
    const [workspaces] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES);
    const key = getRequestKey(request.name, bankAccount);
    const {status} = useRequestKeyState(key);

    function read() {
        if (getIsOffline()) {
            return;
        }
        const spec = request.build(getSavedOnboardingData(target, formID, {account, mainDraft, signerDraft, workspaces}));
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

    useReadAgainOnReconnect(read, isEnabled && status !== 'succeeded' && status !== 'pending');

    return {isPending: status === 'pending', hasFailed: status === 'failed'};
}

export default useReadOnOpen;
export {useReadAgainOnReconnect};
