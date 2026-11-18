import ONYXKEYS from '@src/ONYXKEYS';

import {useEffect, useRef} from 'react';

import useOnyx from './useOnyx';

/**
 * Defers navigation (onSubmit) until the reimbursement account API call completes.
 * Instead of navigating to the next step immediately after firing the API call,
 * this hook waits for the pending flag (`isLoading` by default) to go back to `false` and checks for errors.
 *
 * @param onSubmit - callback that navigates to the next step
 * @param pendingFlag - the flag the API action keeps true while its request is in flight
 * @returns markSubmitting - call this right after firing the API action
 */
export default function useReimbursementAccountSubmitCallback(
    onSubmit?: () => void,
    pendingFlag: 'isLoading' | 'isSavingCorpayOnboardingCompanyFields' | 'isSavingCorpayOnboardingBeneficialOwnersFields' | 'isFinishingCorpayBankAccountOnboarding' = 'isLoading',
) {
    const [reimbursementAccount] = useOnyx(ONYXKEYS.REIMBURSEMENT_ACCOUNT);
    const isSubmittingRef = useRef(false);
    const isPending = !!reimbursementAccount?.[pendingFlag];

    useEffect(() => {
        if (!isSubmittingRef.current || isPending) {
            return;
        }

        // The request has settled. If it failed, disarm the pending flag so that a later
        // state change that clears the error (e.g. on reconnect after connectivity change) can't resurrect
        // this stale submit and wrongly advance to the next step.
        if (reimbursementAccount?.errors) {
            isSubmittingRef.current = false;
            return;
        }

        isSubmittingRef.current = false;
        onSubmit?.();
    }, [isPending, reimbursementAccount?.errors, onSubmit]);

    return () => {
        isSubmittingRef.current = true;
    };
}
