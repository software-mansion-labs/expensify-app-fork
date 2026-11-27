/**
 * The entry of a pending USD account: it opens the validation step once and shows a loader, so the options are never
 * painted on the way. When the focus returns to the entry after the validation step covered it (the Back of the
 * browser, for example), the entry would only show this loader again, so it leaves the onboarding instead.
 */
import ReimbursementAccountLoadingIndicator from '@components/ReimbursementAccountLoadingIndicator';

import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {leaveOnboarding, openFlow} from '@pages/SimplifiedBankOnboarding/core';

import type {Route} from '@src/ROUTES';

import {useIsFocused} from '@react-navigation/native';
import React, {useEffect, useEffectEvent, useRef} from 'react';

type PendingValidationRedirectProps = {
    policyID: string | undefined;
    backTo: Route | undefined;

    /** The validation step reads the account and fetches nothing, so the account must outlive the entry while that step is open */
    keepAccountOnUnmount: () => void;
    releaseAccountOnUnmount: () => void;
};

/** `waiting`: nothing done yet. `redirected`: the validation step was opened. `covered`: a screen covers the entry since then. */
type RedirectPhase = 'waiting' | 'redirected' | 'covered';

function PendingValidationRedirect({policyID, backTo, keepAccountOnUnmount, releaseAccountOnUnmount}: PendingValidationRedirectProps) {
    const isFocused = useIsFocused();
    const phaseRef = useRef<RedirectPhase>('waiting');

    const leave = () => {
        releaseAccountOnUnmount();
        leaveOnboarding(backTo);
    };

    const followFocus = useEffectEvent((isScreenFocused: boolean) => {
        const phase = phaseRef.current;
        if (phase === 'waiting') {
            keepAccountOnUnmount();

            // The account turned pending while a screen covered the entry, and that screen is the flow, which already shows the validation step.
            if (!isScreenFocused) {
                phaseRef.current = 'covered';
                return;
            }

            // A push and not a replace: replacing unmounts the entry, and its cleanup clears the data that the validation step reads.
            phaseRef.current = 'redirected';
            openFlow({kind: 'usd', policyID, backTo}, {step: SBO_CONST.USD.PAGE_NAMES.VALIDATION});
            return;
        }
        if (!isScreenFocused) {
            phaseRef.current = 'covered';
            return;
        }
        if (phase === 'covered') {
            leave();
        }
    });

    useEffect(() => {
        followFocus(isFocused);
    }, [isFocused]);

    return <ReimbursementAccountLoadingIndicator onBackButtonPress={leave} />;
}

export default PendingValidationRedirect;
export type {PendingValidationRedirectProps};
