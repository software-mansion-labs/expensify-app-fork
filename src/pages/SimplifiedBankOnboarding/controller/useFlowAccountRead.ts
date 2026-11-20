/**
 * The readiness of a bank account flow that is opened by a deep link. The account key is shared by every workspace, so
 * the plan may only be built once the key describes the workspace of the flow. The entry page reads the account before
 * it opens a flow; a flow opened without the entry page starts the same read itself and waits for it.
 */
import {belongsToPolicy} from '@pages/SimplifiedBankOnboarding/model/setupStatus';
import useAccountRead from '@pages/SimplifiedBankOnboarding/requests/entry/useAccountRead';
import type {OnboardingAccount} from '@pages/SimplifiedBankOnboarding/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

import {useEffect, useEffectEvent} from 'react';

import type {FlowDataStatus} from './types';

function useFlowAccountRead(policyID: string | undefined, account: OnyxEntry<OnboardingAccount>): FlowDataStatus {
    // A flow URL without a workspace has nothing to read, so the plan is built from the data that is there
    const isLoaded = !policyID || belongsToPolicy(account?.achData, policyID);

    // The entry page may have started the read already, and then the screen waits for that read instead
    const {readAccount, hasReadFailed} = useAccountRead(isLoaded ? undefined : {policyID}, {shouldJoinPendingRead: true});
    const startRead = useEffectEvent(readAccount);

    // Reads the account when the screen opens on a workspace that the account key does not describe
    useEffect(() => {
        startRead();
    }, [isLoaded, policyID]);

    if (isLoaded) {
        return 'ready';
    }
    return hasReadFailed ? 'notFound' : 'loading';
}

export default useFlowAccountRead;
