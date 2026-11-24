/**
 * Reads the account of a workspace or a bank account, and reads it again after a reconnect while the last read of this
 * component did not succeed. Many pages read the same account, so the state reports only the reads of this component.
 */
import type {RequestOutcome} from '@pages/SimplifiedBankOnboarding/core/requests/types';
import {useReadAgainOnReconnect} from '@pages/SimplifiedBankOnboarding/core/requests/useReadOnOpen';

import {useEffect, useEffectEvent, useState} from 'react';

import type {OpenOnboardingPageParams} from './openOnboardingPage';

import openOnboardingPage from './openOnboardingPage';

type AccountReadParams = Pick<OpenOnboardingPageParams, 'policyID' | 'bankAccountID'>;

type AccountReadExtra = Pick<OpenOnboardingPageParams, 'stepToOpen' | 'subStep' | 'localCurrentStep'>;

type AccountReadOptions = {
    /** Default false */
    shouldReadOnMount?: boolean;

    /** Default true */
    shouldReadOnReconnect?: boolean;
};

type ReadStatus = RequestOutcome['status'] | 'pending';

function useAccountRead(
    params: AccountReadParams | undefined,
    {shouldReadOnMount = false, shouldReadOnReconnect = true}: AccountReadOptions = {},
): {readAccount: (extra?: AccountReadExtra) => void; isReadPending: boolean; hasReadFailed: boolean} {
    const [lastStatus, setLastStatus] = useState<ReadStatus | undefined>(() => (shouldReadOnMount && params ? 'pending' : undefined));

    function startRead(extra?: AccountReadExtra) {
        if (!params) {
            return;
        }
        openOnboardingPage({...params, ...extra}).then((outcome) => setLastStatus(outcome.status));
    }

    function readAccount(extra?: AccountReadExtra) {
        if (!params) {
            return;
        }
        setLastStatus('pending');
        startRead(extra);
    }

    const readOnMount = useEffectEvent(() => startRead());
    useEffect(() => {
        if (!shouldReadOnMount) {
            return;
        }
        readOnMount();
    }, [shouldReadOnMount]);

    useReadAgainOnReconnect(() => readAccount(), shouldReadOnReconnect && lastStatus !== 'succeeded' && lastStatus !== 'pending');

    return {readAccount, isReadPending: lastStatus === 'pending', hasReadFailed: lastStatus === 'failed'};
}

export default useAccountRead;
export type {AccountReadExtra, AccountReadParams, AccountReadOptions};
