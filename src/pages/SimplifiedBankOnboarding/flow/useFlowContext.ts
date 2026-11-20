/**
 * Builds the context of the flow definitions for a flow page. The draft and the currency come from narrow selectors, so a
 * keystroke in a form only re-renders the flow page when it changes a field that a step predicate reads. The server part
 * is the whole `achData`, which only changes when a request settles.
 */
import useOnyx from '@hooks/useOnyx';

import type {OnboardingForm} from '@pages/SimplifiedBankOnboarding/types/form';
import type {OnboardingAccount, Workspaces} from '@pages/SimplifiedBankOnboarding/types/onyx';

import ONYXKEYS from '@src/ONYXKEYS';

import type {OnyxEntry} from 'react-native-onyx';

import type {FlowContext} from './types';

function selectACHData(account: OnyxEntry<OnboardingAccount>) {
    return account?.achData;
}

/** Picks the draft fields that the step predicates read */
function selectFlowDraft(draft: OnyxEntry<OnboardingForm>): FlowContext['draft'] {
    if (!draft) {
        return undefined;
    }
    return {
        country: draft.country,
        currency: draft.currency,
        setupType: draft.setupType,
        authorizedToBindClientToAgreement: draft.authorizedToBindClientToAgreement,
        agreeToTermsAndConditions: draft.agreeToTermsAndConditions,
        consentToPrivacyNotice: draft.consentToPrivacyNotice,
        bankStatement: draft.bankStatement,
    };
}

function useFlowContext(policyID: string | undefined): FlowContext {
    const [server] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {selector: selectACHData});
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT, {selector: selectFlowDraft});
    const selectWorkspaceCurrency = (workspaces: OnyxEntry<Workspaces>) => (policyID ? workspaces?.[policyID]?.outputCurrency : undefined);
    const [workspaceCurrency] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES, {selector: selectWorkspaceCurrency});

    return {currency: workspaceCurrency ?? server?.currency ?? draft?.currency, server, draft};
}

export default useFlowContext;
