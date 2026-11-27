/**
 * Sends the requests of one definition for the bank account of the open flow, and reports their state.
 *
 * What it hides: the read of the flow data at the moment of the send, the bank account scope of the flow, the default of
 * the account error mirror, and the guard against a second send while one is pending (also within one tick).
 */
import type {FlowTarget} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';
import {useOnboardingFlow} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';
import type {FlowData} from '@pages/SimplifiedBankOnboarding/core/flow/flowData';
import {buildFlowData} from '@pages/SimplifiedBankOnboarding/core/flow/flowData';

import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

import type {RequestKey} from './runRequest';
import type {OnboardingRequest, RequestName, RequestOutcome} from './types';

import {getRequestKey, sendTrackedRequest, useRequestKeyState} from './runRequest';

/**
 * `userAction`: a press of the user, guarded against a second send while one is pending.
 * `background`: a send that no press started (the save after each page), never guarded, and its failure is not mirrored
 * to the account (BC-08).
 */
type SendMode = 'userAction' | 'background';

/** The keys of the user action sends that have not settled yet. A key is added at the press, so a second press in the same tick finds it. */
const keysBeingSent = new Set<RequestKey>();

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
    const {target} = useOnboardingFlow();

    async function readFlowData(): Promise<FlowData> {
        const [account, mainDraft, signerDraft, workspaces] = await Promise.all([
            Onyx.get(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT),
            Onyx.get(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT),
            Onyx.get(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM_DRAFT),
            Onyx.get(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES),
        ]);
        return buildFlowData(target, {account, mainDraft, signerDraft, workspace: target.policyID ? workspaces?.[target.policyID] : undefined});
    }

    async function buildAndSend(sentRequest: OnboardingRequest<TInput>, sentKey: RequestKey, input: TInput): Promise<RequestOutcome> {
        try {
            const spec = sentRequest.build(await readFlowData(), input);
            return await sendTrackedRequest(sentKey, spec && {...spec, shouldShowErrorOutsideFlow: spec.shouldShowErrorOutsideFlow ?? shouldMirrorErrorByDefault(target, spec.type, mode)});
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
            if (keysBeingSent.has(key)) {
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
 * A send that no press started: the progress save of the step shell (`saveAfterEachPage`). Each call sends without the
 * pending guard, so each progress save goes out, and offline each one waits in the queue (BC-15). Its failure is not
 * mirrored to the account (BC-08). Internal to core.
 */
function useBackgroundRequest(request: OnboardingRequest | undefined): () => Promise<RequestOutcome> {
    const key = useFlowRequestKey(request?.name);
    const send = useSendOnboardingRequest(request, key, 'background');
    return () => send();
}

export default useOnboardingRequest;
export {useBackgroundRequest};
