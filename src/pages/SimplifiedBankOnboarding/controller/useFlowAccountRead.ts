/**
 * The readiness of a bank account flow that is opened by a deep link. The account key is shared by every workspace, so
 * the plan may only be built once the key describes the workspace of the flow. The entry page reads the account before
 * it opens a flow; a flow opened without the entry page starts the same read itself and waits for it.
 */
import useNetwork from '@hooks/useNetwork';

import {belongsToPolicy} from '@pages/SimplifiedBankOnboarding/model/setupStatus';
import openOnboardingPage from '@pages/SimplifiedBankOnboarding/requests/entry/openOnboardingPage';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import useRequestState from '@pages/SimplifiedBankOnboarding/requests/useRequestState';
import type {OnboardingAccount} from '@pages/SimplifiedBankOnboarding/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

import {useEffect, useEffectEvent, useState} from 'react';

import type {FlowDataStatus} from './types';

function useFlowAccountRead(policyID: string | undefined, account: OnyxEntry<OnboardingAccount>): FlowDataStatus {
    const {isPending} = useRequestState(REQUEST_NAMES.OPEN_ONBOARDING_PAGE);

    // The outcome of the read that this screen started. The request status may still hold the failure of an older read.
    const [hasReadFailed, setHasReadFailed] = useState(false);

    // A flow URL without a workspace has nothing to read, so the plan is built from the data that is there
    const isLoaded = !policyID || belongsToPolicy(account?.achData, policyID);

    // The entry page may have started the read already, and then the screen waits for that read instead
    const readAccount = () => {
        if (isLoaded || isPending) {
            return;
        }
        openOnboardingPage({policyID}).then((outcome) => setHasReadFailed(outcome.status === 'failed'));
    };
    const startRead = useEffectEvent(readAccount);

    // A read made offline is not sent, so it starts again with the connection
    useNetwork({onReconnect: readAccount});

    // Reads the account when the screen opens on a workspace that the account key does not describe
    useEffect(() => {
        startRead();
    }, [isLoaded, policyID]);

    if (isLoaded) {
        return 'ready';
    }
    return hasReadFailed && !isPending ? 'notFound' : 'loading';
}

export default useFlowAccountRead;
