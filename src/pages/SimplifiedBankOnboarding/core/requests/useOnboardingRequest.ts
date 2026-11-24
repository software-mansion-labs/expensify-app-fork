/**
 * Sends the requests of one definition for the bank account of the open flow, and reports their state.
 *
 * What it hides: the read of the saved data (account, drafts, workspace) at the moment of the send, the bank account
 * scope and the form of the flow, the default of the account error mirror, the guard against a second send while one is
 * pending (also within one tick), and a request that cannot be built, which counts as a failed attempt.
 */
import {getSetupCurrency} from '@pages/SimplifiedBankOnboarding/contract/currency';
import type {EnterSignerInfoForm, OnboardingDraft, OnboardingFormID} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {OnboardingAccount, Workspaces} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import {getFormDraft} from '@pages/SimplifiedBankOnboarding/core/draft/draft';
import type {FlowTarget} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';
import {getFlowBankAccount, useOnboardingFlow} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';

import ONYXKEYS from '@src/ONYXKEYS';

import type {OnyxEntry} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

import type {RequestKey} from './runRequest';
import type {OnboardingRequest, RequestName, RequestOutcome, SavedOnboardingData} from './types';

import {failUnsentRequest, getRequestKey, isRequestInFlight, sendTrackedRequest, useRequestKeyState} from './runRequest';

type SavedDataSources = {
    account: OnyxEntry<OnboardingAccount>;
    mainDraft: OnyxEntry<OnboardingDraft>;
    signerDraft: OnyxEntry<Partial<EnterSignerInfoForm>>;
    workspaces: OnyxEntry<Workspaces>;
};

/**
 * `userAction`: a press of the user, guarded against a second send while one is pending.
 * `progressSave`: the save after each page, never guarded, and its failure is not mirrored to the account (BC-08).
 */
type SendMode = 'userAction' | 'progressSave';

/** The keys of the sends that have not settled yet. It covers the time before runRequest counts them, so a second press in the same tick finds them. */
const keysBeingSent = new Set<RequestKey>();

/** The data a request is built from, from the values of the Onyx keys */
function getSavedOnboardingData(target: FlowTarget, formID: OnboardingFormID, {account, mainDraft, signerDraft, workspaces}: SavedDataSources): SavedOnboardingData {
    const draft = getFormDraft(formID, mainDraft, signerDraft);
    const workspace = target.policyID ? workspaces?.[target.policyID] : undefined;
    return {
        bankAccount: getFlowBankAccount(target, account?.achData),
        account,
        draft,
        currency: getSetupCurrency(workspace, account?.achData, draft),
    };
}

/** A write of the USD or NonUSD flow shows its failure also on the entry and the Payments page */
function shouldMirrorErrorByDefault(target: FlowTarget, type: 'read' | 'write', mode: SendMode): boolean {
    return mode === 'userAction' && type === 'write' && (target.kind === 'usd' || target.kind === 'nonUSD');
}

/** The key of a definition for the bank account of the open flow, or undefined without a definition */
function useFlowRequestKey(name: RequestName | undefined): RequestKey | undefined {
    const {bankAccount} = useOnboardingFlow();
    return name ? getRequestKey(name, bankAccount) : undefined;
}

function useSendOnboardingRequest<TInput>(request: OnboardingRequest<TInput> | undefined, key: RequestKey | undefined, mode: SendMode): (input: TInput) => Promise<RequestOutcome> {
    const {target, formID} = useOnboardingFlow();

    async function readSavedData(): Promise<SavedOnboardingData> {
        const [account, mainDraft, signerDraft, workspaces] = await Promise.all([
            Onyx.get(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT),
            Onyx.get(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT),
            Onyx.get(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM_DRAFT),
            Onyx.get(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES),
        ]);
        return getSavedOnboardingData(target, formID, {account, mainDraft, signerDraft, workspaces});
    }

    async function buildAndSend(sentRequest: OnboardingRequest<TInput>, sentKey: RequestKey, input: TInput): Promise<RequestOutcome> {
        try {
            const spec = sentRequest.build(await readSavedData(), input);
            if (!spec) {
                return await failUnsentRequest(sentKey, {});
            }
            return await sendTrackedRequest(sentKey, {...spec, shouldShowErrorOutsideFlow: spec.shouldShowErrorOutsideFlow ?? shouldMirrorErrorByDefault(target, spec.type, mode)});
        } finally {
            if (mode === 'userAction') {
                keysBeingSent.delete(sentKey);
            }
        }
    }

    function send(input: TInput): Promise<RequestOutcome> {
        if (!request || !key) {
            return Promise.resolve({status: 'skipped'});
        }
        if (mode === 'userAction') {
            if (isRequestInFlight(key) || keysBeingSent.has(key)) {
                return Promise.resolve({status: 'skipped'});
            }
            keysBeingSent.add(key);
        }
        return buildAndSend(request, key, input);
    }

    return send;
}

/**
 * Sends requests of one definition for the bank account of the open flow, and reports their state. A second send while
 * one is pending sends nothing and resolves `skipped`. Without a definition, `send` resolves `skipped` and the state is
 * empty, so a block with an optional request calls the hook unconditionally. Works only inside OnboardingFlow.
 */
function useOnboardingRequest<TInput = void>(
    request: OnboardingRequest<TInput> | undefined,
): {send: (input: TInput) => Promise<RequestOutcome>; isPending: boolean; errorMessage: string | undefined} {
    const key = useFlowRequestKey(request?.name);
    const {isPending, errorMessage} = useRequestKeyState(key);
    const send = useSendOnboardingRequest(request, key, 'userAction');
    return {send, isPending, errorMessage};
}

/**
 * The progress save of the step shell (`saveAfterEachPage`). Every page sends it without the pending guard, so each save
 * goes out, and offline each one waits in the queue (BC-15). Its failure is shown nowhere (BC-08). Internal to core.
 */
function useProgressSaveRequest(request: OnboardingRequest | undefined): () => Promise<RequestOutcome> {
    const key = useFlowRequestKey(request?.name);
    const send = useSendOnboardingRequest(request, key, 'progressSave');
    return () => send();
}

export default useOnboardingRequest;
export {getSavedOnboardingData, useProgressSaveRequest};
export type {SavedDataSources};
