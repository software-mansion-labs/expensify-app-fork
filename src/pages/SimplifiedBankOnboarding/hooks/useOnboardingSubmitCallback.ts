/**
 * Waits for a USD request before moving to the next step. Every USD request shares the same `isLoading` and `errors`,
 * so the hook cannot tell which request settled and relies on a ref that the step arms right after it sends one.
 * It mirrors `useReimbursementAccountSubmitCallback`.
 */
import useOnyx from '@hooks/useOnyx';

import ONYXKEYS from '@src/ONYXKEYS';

import {useEffect, useRef} from 'react';

function useOnboardingSubmitCallback(onSubmit?: () => void) {
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const isSubmittingRef = useRef(false);

    useEffect(() => {
        if (!isSubmittingRef.current || account?.isLoading) {
            return;
        }

        // The request settled. A failed one disarms the ref too, so clearing the error later cannot move the user forward.
        isSubmittingRef.current = false;
        if (account?.errors) {
            return;
        }
        onSubmit?.();
    }, [account?.isLoading, account?.errors, onSubmit]);

    return () => {
        isSubmittingRef.current = true;
    };
}

export default useOnboardingSubmitCallback;
