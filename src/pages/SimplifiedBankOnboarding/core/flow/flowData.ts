/**
 * The data of one flow in one shape: its bank account, the account that the server keeps, the draft of the flow's form
 * and the currency. Requests are built from it, the answers of a step are read from it, and a flow page tests the
 * completion rules of its steps on it.
 *
 * What it hides: which of the two draft keys belongs to the flow, the workspace that names the currency, and the bank
 * account scope of the invited director.
 */
import useOnyx from '@hooks/useOnyx';

import {getSetupCurrency} from '@pages/SimplifiedBankOnboarding/contract/currency';
import type {EnterSignerInfoForm, OnboardingDraft, OnboardingFormID} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {OnboardingAccount, Workspace, Workspaces} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import {getFormDraft} from '@pages/SimplifiedBankOnboarding/core/draft/draft';
import type {BankAccountParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import ONYXKEYS from '@src/ONYXKEYS';

import type {OnyxEntry} from 'react-native-onyx';

import type {FlowTarget} from './flowContext';

import {getFlowBankAccount, useOnboardingFlow} from './flowContext';

type FlowData = {
    /** The bank account of the flow: the route's policyID and the account's bankAccountID */
    bankAccount: BankAccountParams;
    account: OnyxEntry<OnboardingAccount>;

    /** The draft of the form of the flow: the main form, or the invited director form */
    draft: OnboardingDraft;
    currency: string | undefined;
};

/** The values of the Onyx keys that the data of a flow is built from */
type FlowDataSources = {
    account: OnyxEntry<OnboardingAccount>;
    mainDraft: OnyxEntry<OnboardingDraft>;
    signerDraft: OnyxEntry<Partial<EnterSignerInfoForm>>;
    workspace: OnyxEntry<Workspace>;
};

/** The invited director fills in a form of its own, every other flow the main form */
function getFlowFormID(target: FlowTarget): OnboardingFormID {
    return target.kind === 'enterSignerInfo' ? ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM : ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM;
}

/** For a handler that reads the keys once at a send. Components use the hooks below. */
function buildFlowData(target: FlowTarget, {account, mainDraft, signerDraft, workspace}: FlowDataSources): FlowData {
    const draft = getFormDraft(getFlowFormID(target), mainDraft, signerDraft);
    return {
        bankAccount: getFlowBankAccount(target, account?.achData),
        account,
        draft,
        currency: getSetupCurrency(workspace, account?.achData, draft),
    };
}

/** The data of the flow of `target`, for a flow page, which renders above OnboardingFlow */
function useFlowDataOf(target: FlowTarget): FlowData {
    const policyID = target.policyID;
    const selectWorkspace = (workspaces: OnyxEntry<Workspaces>) => (policyID ? workspaces?.[policyID] : undefined);
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [mainDraft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);
    const [signerDraft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM_DRAFT);
    const [workspace] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES, {selector: selectWorkspace});

    return buildFlowData(target, {account, mainDraft, signerDraft, workspace});
}

/** The data of the open flow, for any component inside OnboardingFlow */
function useFlowData(): FlowData {
    const {target} = useOnboardingFlow();
    return useFlowDataOf(target);
}

export {buildFlowData, getFlowFormID, useFlowData, useFlowDataOf};
export type {FlowData};
