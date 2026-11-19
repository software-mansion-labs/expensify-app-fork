/**
 * Requests do not keep their state in components, so a page that remounts still sees a pending request or its error.
 * This hook reads that state for one request name from the request status key.
 */
import useOnyx from '@hooks/useOnyx';

import type {OnboardingRequests} from '@pages/SimplifiedBankOnboarding/types/onyx';

import ONYXKEYS from '@src/ONYXKEYS';
import type * as OnyxCommon from '@src/types/onyx/OnyxCommon';

import type {OnyxEntry} from 'react-native-onyx';

import type {RequestName} from './REQUEST_NAMES';

type RequestStateResult = {
    isPending: boolean;

    /** The errors of the last attempt. They stay until the next attempt of the same request starts. */
    errors: OnyxCommon.Errors | undefined;
};

/** The state of one request for the page that sent it. A page without a request gets an idle state. */
function useRequestState(name: RequestName | undefined): RequestStateResult {
    const selectRequest = (requests: OnyxEntry<OnboardingRequests>) => (name ? requests?.[name] : undefined);
    const [request] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_REQUESTS, {selector: selectRequest});

    return {
        isPending: request?.status === 'pending',
        errors: request?.status === 'failed' ? (request.errors ?? undefined) : undefined,
    };
}

export default useRequestState;
export type {RequestStateResult};
