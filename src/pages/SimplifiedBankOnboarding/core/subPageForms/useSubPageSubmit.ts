/**
 * The submit path of every block, for custom pages with their own FormProvider (the server-driven bank form, the email
 * page, the agreements). `submit` saves the values to the draft, then outside edit mode sends the request and moves on
 * after a success. In edit mode it returns to the confirmation and sends nothing.
 */
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import {useOnboardingFlow} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';
import type {OnboardingRequest, RequestOutcome} from '@pages/SimplifiedBankOnboarding/core/requests/types';
import useOnboardingRequest from '@pages/SimplifiedBankOnboarding/core/requests/useOnboardingRequest';
import {usePageNavigation} from '@pages/SimplifiedBankOnboarding/core/step/pageNavigation';
import type {PageTarget} from '@pages/SimplifiedBankOnboarding/core/step/readSubPages';

const SUCCEEDED: RequestOutcome = {status: 'succeeded'};

function useSubPageSubmit({request}: {request?: OnboardingRequest}): {
    submit: (draftValues: OnboardingDraft, next?: PageTarget) => void;
    isPending: boolean;
    errorMessage: string | undefined;
} {
    const {saveDraft} = useOnboardingFlow();
    const {isEditing, goNextAfter} = usePageNavigation();
    const {send, isPending, errorMessage} = useOnboardingRequest(request);

    function submit(draftValues: OnboardingDraft, next?: PageTarget) {
        const saved = saveDraft(draftValues);
        if (isEditing || !request) {
            goNextAfter(
                saved.then(() => SUCCEEDED),
                next,
            );
            return;
        }
        goNextAfter(
            saved.then(() => send()),
            next,
        );
    }

    return {submit, isPending, errorMessage};
}

export default useSubPageSubmit;
