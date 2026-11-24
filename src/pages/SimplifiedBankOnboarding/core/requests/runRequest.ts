/* eslint-disable rulesdir/prefer-actions-set-data -- This file is the request layer of an isolated research module, so it lives outside src/libs/actions */
/**
 * Sends one request of the lab and tracks it in the RAM-only key `simplifiedBankOnboardingRequests`, so a page reads the
 * state of its own request and nothing else, also after it remounts.
 *
 * What it hides:
 * - the request key `name:policy-<id>` or `name:bankAccount-<id>` (a request of a bank account never shows on another one)
 * - the requestID of each attempt, so the answer of an older attempt never settles a newer one
 * - the four status updates (optimistic pending, success, failure, finally `hasResponse`) added to the data of the caller
 * - the bridge from Onyx data to a Promise, and an answer that applied neither success nor failure data (settled as failed)
 * - offline reads (not sent, nothing written) and offline writes (queued by the mock API, and their Promise with them)
 * - the account error mirror (`account.errors`) and its lifetime: it uses the error key of the attempt, and it is cleared
 *   with the page error when the last user of the request key unmounts, or as soon as a failure arrives with no user
 * - the count of requests in flight per key (the guard against a second press) and of mounted users per key
 */
import useOnyx from '@hooks/useOnyx';

import {getLatestErrorMessage, getMicroSecondOnyxErrorWithTranslationKey} from '@libs/ErrorUtils';
import {getIsOffline} from '@libs/NetworkState';
import {rand64} from '@libs/NumberUtils';

import type {OnboardingRequests, RequestState} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import {read, write} from '@pages/SimplifiedBankOnboarding/mockBackend/mockApi';

import ONYXKEYS from '@src/ONYXKEYS';
import type {Errors} from '@src/types/onyx/OnyxCommon';
import type {OnyxData} from '@src/types/onyx/Request';

import type {OnyxEntry, OnyxUpdate} from 'react-native-onyx';

import {useEffect} from 'react';
import Onyx from 'react-native-onyx';

import type {MockRequest, RequestName, RequestOnyxKey, RequestOutcome, RequestScope, RequestSpec} from './types';

type RequestKey = string;

type RequestKeyState = {
    /** The status of the last attempt, while Onyx holds it */
    status: RequestState['status'] | undefined;
    isPending: boolean;
    errorMessage: string | undefined;
};

type AttemptOptions = Pick<RequestSpec, 'errorKey' | 'shouldShowErrorOutsideFlow'>;

type Waiter = {
    requestID: string;
    errors: Errors;
    shouldShowErrorOutsideFlow: boolean;
    resolve: (outcome: RequestOutcome) => void;
};

const GENERIC_ERROR_KEY = 'common.genericErrorMessage';
const SKIPPED: RequestOutcome = {status: 'skipped'};

/** The attempt that each key waits for. A newer attempt with the same key settles the older one as skipped. */
const waiters = new Map<RequestKey, Waiter>();
const inFlightCounts = new Map<RequestKey, number>();
const mountedUserCounts = new Map<RequestKey, number>();

/** The attempts whose status entry Onyx already held, so a removed entry can be told from one not written yet */
const seenRequestIDs = new Set<string>();

/** The requestID of the attempt that wrote the account error mirror, per key */
const mirroredRequestIDs = new Map<RequestKey, string>();

let latestRequests: OnyxEntry<OnboardingRequests>;
let latestAccountErrors: Errors | null | undefined;

function getRequestKey(name: RequestName, scope?: RequestScope): RequestKey {
    if (scope?.policyID) {
        return `${name}:policy-${scope.policyID}`;
    }
    if (scope?.bankAccountID) {
        return `${name}:bankAccount-${scope.bankAccountID}`;
    }
    return name;
}

function buildStatusUpdate(key: RequestKey, value: Partial<RequestState> | null): OnyxUpdate<typeof ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS> {
    return {onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS, value: {[key]: value}};
}

function buildAccountErrorsUpdate(errors: Errors | null): OnyxUpdate<typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT> {
    return {onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, value: {errors}};
}

function buildFailureUpdates(key: RequestKey, requestID: string, errors: Errors, shouldShowErrorOutsideFlow: boolean): Array<OnyxUpdate<RequestOnyxKey>> {
    const statusUpdate = buildStatusUpdate(key, {requestID, status: 'failed', errors});
    return shouldShowErrorOutsideFlow ? [statusUpdate, buildAccountErrorsUpdate(errors)] : [statusUpdate];
}

function addStatusUpdates(key: RequestKey, waiter: Waiter, onyxData: OnyxData<RequestOnyxKey>): OnyxData<RequestOnyxKey> {
    const {requestID, errors, shouldShowErrorOutsideFlow} = waiter;
    const optimisticUpdates: Array<OnyxUpdate<RequestOnyxKey>> = [buildStatusUpdate(key, {requestID, status: 'pending', errors: null, hasResponse: false})];
    if (shouldShowErrorOutsideFlow) {
        optimisticUpdates.push(buildAccountErrorsUpdate(null));
    }

    return {
        ...onyxData,
        optimisticData: [...(onyxData.optimisticData ?? []), ...optimisticUpdates],
        successData: [...(onyxData.successData ?? []), buildStatusUpdate(key, {requestID, status: 'succeeded', errors: null})],
        failureData: [...(onyxData.failureData ?? []), ...buildFailureUpdates(key, requestID, errors, shouldShowErrorOutsideFlow)],
        finallyData: [...(onyxData.finallyData ?? []), buildStatusUpdate(key, {requestID, hasResponse: true})],
    };
}

function hasAccountErrorOf(entryErrors: Errors | null | undefined): boolean {
    return Object.keys(entryErrors ?? {}).some((errorKey) => !!latestAccountErrors?.[errorKey]);
}

/** Clears the page error of a key and its account error mirror, unless a component that uses the key is mounted */
function clearUnusedFailure(key: RequestKey): Promise<void> {
    const entry = latestRequests?.[key];
    if ((mountedUserCounts.get(key) ?? 0) > 0 || entry?.status !== 'failed') {
        return Promise.resolve();
    }

    const shouldClearMirror = mirroredRequestIDs.get(key) === entry.requestID && hasAccountErrorOf(entry.errors);
    mirroredRequestIDs.delete(key);
    const updates: Array<OnyxUpdate<RequestOnyxKey>> = [buildStatusUpdate(key, null)];
    if (shouldClearMirror) {
        updates.push(buildAccountErrorsUpdate(null));
    }
    return Onyx.update(updates);
}

function settleWaiter(key: RequestKey, waiter: Waiter, outcome: RequestOutcome) {
    if (waiters.get(key) === waiter) {
        waiters.delete(key);
    }
    seenRequestIDs.delete(waiter.requestID);
    waiter.resolve(outcome);
}

function updateWaiter(key: RequestKey, waiter: Waiter) {
    const entry = latestRequests?.[key];
    if (entry?.requestID !== waiter.requestID) {
        // A reset of the lab or a clear of the state removed the entry, so this attempt has no answer to report
        if (seenRequestIDs.has(waiter.requestID)) {
            settleWaiter(key, waiter, SKIPPED);
        }
        return;
    }

    seenRequestIDs.add(waiter.requestID);
    if (!entry.hasResponse) {
        return;
    }

    // The answer applied neither the success nor the failure data, which the real API does when the command needs an admin
    if (entry.status === 'pending') {
        Onyx.update(buildFailureUpdates(key, waiter.requestID, waiter.errors, waiter.shouldShowErrorOutsideFlow));
        return;
    }
    settleWaiter(key, waiter, {status: entry.status});
}

// The request layer runs outside render: a handler awaits the answer of a request, and a failure that arrives after its
// page unmounted is cleared here. No component is there to subscribe with useOnyx, so the module listens to the request
// key to settle the Promises and to know the current state of each entry when it clears one.
Onyx.connectWithoutView({
    key: ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS,
    callback: (requests) => {
        latestRequests = requests;
        for (const [key, waiter] of [...waiters]) {
            updateWaiter(key, waiter);
        }
    },
});

// The mirror is cleared after an unmount or a late failure, outside render, and only while `account.errors` still holds
// the error of that request. No component is there to subscribe with useOnyx, so the module keeps the current errors.
Onyx.connectWithoutView({
    key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT,
    callback: (account) => {
        latestAccountErrors = account?.errors;
    },
});

function sendMockRequest(request: MockRequest, onyxData: OnyxData<RequestOnyxKey>) {
    if (request.type === 'read') {
        read(request.command, request.params, onyxData);
        return;
    }
    write(request.command, request.params, onyxData);
}

function startAttempt(key: RequestKey, options: AttemptOptions): {waiter: Waiter; outcome: Promise<RequestOutcome>} {
    const previousWaiter = waiters.get(key);
    if (previousWaiter) {
        settleWaiter(key, previousWaiter, SKIPPED);
    }

    let resolveOutcome: (outcome: RequestOutcome) => void = () => {};
    const outcome = new Promise<RequestOutcome>((resolve) => {
        resolveOutcome = resolve;
    });
    const waiter: Waiter = {
        requestID: rand64(),
        errors: getMicroSecondOnyxErrorWithTranslationKey(options.errorKey ?? GENERIC_ERROR_KEY),
        shouldShowErrorOutsideFlow: !!options.shouldShowErrorOutsideFlow,
        resolve: resolveOutcome,
    };
    waiters.set(key, waiter);
    inFlightCounts.set(key, (inFlightCounts.get(key) ?? 0) + 1);
    if (waiter.shouldShowErrorOutsideFlow) {
        mirroredRequestIDs.set(key, waiter.requestID);
    }

    return {
        waiter,
        outcome: outcome.then((result) => {
            inFlightCounts.set(key, Math.max((inFlightCounts.get(key) ?? 1) - 1, 0));
            if (result.status === 'failed') {
                clearUnusedFailure(key);
            }
            return result;
        }),
    };
}

/** Sends a request under a key. The Promise resolves when Onyx holds the answer. */
function sendTrackedRequest(key: RequestKey, spec: RequestSpec): Promise<RequestOutcome> {
    if (spec.type === 'read' && getIsOffline()) {
        return Promise.resolve(SKIPPED);
    }
    const {waiter, outcome} = startAttempt(key, spec);
    sendMockRequest(spec, addStatusUpdates(key, waiter, spec.onyxData ?? {}));
    return outcome;
}

/** Records a failed attempt that sent nothing, for a request that could not be built */
function failUnsentRequest(key: RequestKey, options: AttemptOptions): Promise<RequestOutcome> {
    const {waiter, outcome} = startAttempt(key, options);
    Onyx.update([...buildFailureUpdates(key, waiter.requestID, waiter.errors, waiter.shouldShowErrorOutsideFlow), buildStatusUpdate(key, {requestID: waiter.requestID, hasResponse: true})]);
    return outcome;
}

function isRequestInFlight(key: RequestKey): boolean {
    return (inFlightCounts.get(key) ?? 0) > 0;
}

/** Counts a mounted user of a key. The returned function releases it, and the last release clears a failure of the key. */
function retainRequestKey(key: RequestKey): () => void {
    mountedUserCounts.set(key, (mountedUserCounts.get(key) ?? 0) + 1);
    return () => {
        mountedUserCounts.set(key, Math.max((mountedUserCounts.get(key) ?? 1) - 1, 0));

        // React may remount the user in the same commit (StrictMode, a key change), so the clear waits for that remount
        Promise.resolve().then(() => clearUnusedFailure(key));
    };
}

/** For code outside a flow (entry, lab). The same tracking as useOnboardingRequest, with an explicit scope. */
function runRequest({name, scope, ...spec}: RequestSpec & {name: RequestName; scope?: RequestScope}): Promise<RequestOutcome> {
    return sendTrackedRequest(getRequestKey(name, scope), spec);
}

/**
 * The state of one request key for a component that shows it. The component counts as a user of the key while mounted.
 * Without a key (a block with no request) it reports nothing.
 */
function useRequestKeyState(key: RequestKey | undefined): RequestKeyState {
    const selectEntry = (requests: OnyxEntry<OnboardingRequests>) => (key ? requests?.[key] : undefined);
    const [entry] = useOnyx(ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS, {selector: selectEntry});

    useEffect(() => {
        if (!key) {
            return;
        }
        return retainRequestKey(key);
    }, [key]);

    return {
        status: entry?.status,
        isPending: entry?.status === 'pending',
        errorMessage: entry?.status === 'failed' ? getLatestErrorMessage(entry) || undefined : undefined,
    };
}

/** Reads the state of a request that runRequest sent, for code outside a flow */
function useRequestState(name: RequestName, scope?: RequestScope): {isPending: boolean; errorMessage: string | undefined} {
    const {isPending, errorMessage} = useRequestKeyState(getRequestKey(name, scope));
    return {isPending, errorMessage};
}

/**
 * Clears the account error mirror, for the Back press of the step shell (BC-04). The page errors stay with their pages.
 * An account error that no request of a flow mirrored stays, for example the error of a failed bank account reset.
 */
function clearAccountErrorMirror(): Promise<void> {
    const hasMirroredError = [...mirroredRequestIDs.keys()].some((key) => hasAccountErrorOf(latestRequests?.[key]?.errors));
    if (!hasMirroredError) {
        return Promise.resolve();
    }
    return Onyx.merge(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {errors: null});
}

/** Clears one status, or every status when called without a name (lab reset, bank account reset) */
function clearRequestState(name?: RequestName, scope?: RequestScope): Promise<void> {
    if (!name) {
        for (const [key, waiter] of [...waiters]) {
            settleWaiter(key, waiter, SKIPPED);
        }
        mirroredRequestIDs.clear();
        return Onyx.set(ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS, null);
    }

    const key = getRequestKey(name, scope);
    const waiter = waiters.get(key);
    if (waiter) {
        settleWaiter(key, waiter, SKIPPED);
    }
    mirroredRequestIDs.delete(key);
    return Onyx.merge(ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS, {[key]: null});
}

export {
    clearAccountErrorMirror,
    clearRequestState,
    failUnsentRequest,
    getRequestKey,
    isRequestInFlight,
    retainRequestKey,
    runRequest,
    sendTrackedRequest,
    useRequestKeyState,
    useRequestState,
};
export type {RequestKey};
