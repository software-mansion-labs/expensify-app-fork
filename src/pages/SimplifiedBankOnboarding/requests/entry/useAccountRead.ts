/**
 * Reads the account of a workspace or of a bank account for one screen and tells whether that read failed. The request
 * status may still hold the failure of an older read, so the screen tracks the outcome of the reads it started itself.
 */
import useNetwork from '@hooks/useNetwork';

import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import useRequestState from '@pages/SimplifiedBankOnboarding/requests/useRequestState';

import {useEffect, useRef, useState} from 'react';

import type {OpenOnboardingPageParams} from './openOnboardingPage';

import openOnboardingPage from './openOnboardingPage';

type AccountReadParams = Pick<OpenOnboardingPageParams, 'policyID' | 'bankAccountID'>;

type AccountReadOptions = {
    /** Another screen may have started the same read, and then this screen waits for it instead of sending a second one */
    shouldJoinPendingRead?: boolean;

    /** A read made offline is not sent, so by default it starts again with the connection */
    shouldReadOnReconnect?: boolean;
};

type AccountRead = {
    /** Sends the read. It does nothing without params. */
    readAccount: () => void;
    isReadPending: boolean;

    /** The last read that this screen started for the current params failed, and no read is running */
    hasReadFailed: boolean;
};

function getParamsKey(params: AccountReadParams | undefined): string | undefined {
    return params ? JSON.stringify([params.policyID, params.bankAccountID]) : undefined;
}

/** Undefined params mean the screen has nothing to read, such as a flow whose account is already there */
function useAccountRead(params: AccountReadParams | undefined, {shouldJoinPendingRead = false, shouldReadOnReconnect = true}: AccountReadOptions = {}): AccountRead {
    const {isPending} = useRequestState(REQUEST_NAMES.OPEN_ONBOARDING_PAGE);
    const paramsKey = getParamsKey(params);

    // Only the last read may report its outcome, so a slow answer of an earlier read or of an unmounted screen is ignored
    const lastReadIDRef = useRef(0);
    const [failedParamsKey, setFailedParamsKey] = useState<string | undefined>();

    const readAccount = () => {
        if (!params || (shouldJoinPendingRead && isPending)) {
            return;
        }
        lastReadIDRef.current += 1;
        const readID = lastReadIDRef.current;
        openOnboardingPage(params).then((outcome) => {
            if (readID !== lastReadIDRef.current) {
                return;
            }
            setFailedParamsKey(outcome.status === 'failed' ? paramsKey : undefined);
        });
    };

    useNetwork({
        onReconnect: () => {
            if (!shouldReadOnReconnect) {
                return;
            }
            readAccount();
        },
    });

    useEffect(
        () => () => {
            lastReadIDRef.current += 1;
        },
        [],
    );

    return {readAccount, isReadPending: isPending, hasReadFailed: !!paramsKey && failedParamsKey === paramsKey && !isPending};
}

export default useAccountRead;
export type {AccountReadParams};
