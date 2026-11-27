/* eslint-disable rulesdir/prefer-actions-set-data -- This file is the action layer of an isolated research module, so it lives outside src/libs/actions */
/**
 * The one way the flow sends a request. It records the state of the request under its key in the request status key,
 * sends it through the mock API and returns a Promise that settles when the status of this very request leaves `pending`.
 * The status comes from the optimistic, success and failure data of the request, like any other server result, so the
 * Promise only tells the handler when Onyx holds the result. The status entry carries a request ID, so the result of an
 * older request with the same key never settles a newer one. The finally data names the request that got its answer, so
 * a request whose answer applied neither the success nor the failure data still settles, as failed. A write is never in
 * flight twice under one key, whoever sends it, so a double press or a page and the controller sending the same write
 * make one call.
 */
import {getMicroSecondOnyxErrorWithTranslationKey} from '@libs/ErrorUtils';
import {getIsOffline} from '@libs/NetworkState';
import {rand64} from '@libs/NumberUtils';

import {read, write} from '@pages/SimplifiedBankOnboarding/mockBackend/mockApi';

import type {TranslationPaths} from '@src/languages/types';
import ONYXKEYS from '@src/ONYXKEYS';
import type {OnyxData} from '@src/types/onyx/Request';

import type {OnyxUpdate} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

import type {RequestKey, RequestScope} from './requestKey';
import type {MockRequest, PlannedRead, PlannedRequest, ReadRequest, RequestOutcome, RequestState} from './types';

import getRequestKey from './requestKey';

type RequestsKey = typeof ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS;

/** Every key a request of the lab may update. A closed union lets the status updates join the updates of the caller. */
type RequestOnyxKey =
    | RequestsKey
    | typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT
    | typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_BANK_FIELDS
    | typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ONFIDO_TOKEN
    | typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PLAID_DATA
    | typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES
    | typeof ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_PLAID_LINK_TOKEN
    | typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT
    | typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM_DRAFT;

type RequestIdentity = {
    /** The name of the user action. Each name is one entry of the request status key. */
    name: string;

    /** The bank account that the request is about. Readers of the status pass the same scope to `getRequestKey`. */
    scope?: RequestScope;
};

type RequestOptions = {
    /** The updates of the request itself. The status updates are added to them. */
    onyxData?: OnyxData<RequestOnyxKey>;

    /** The message that the status entry shows when the request fails */
    errorKey?: TranslationPaths;
};

type RunRequestArgs = MockRequest & RequestIdentity & RequestOptions;

/**
 * The keys of the writes that have not settled yet. A key is added before the write goes out, so a second send in the
 * same tick finds it. Reads are not guarded: two reads with one key may ask for different countries, and a read sent
 * twice changes nothing on the server.
 */
const writesInFlight = new Set<RequestKey>();

function buildStatusUpdate(key: RequestKey, value: Partial<RequestState>): OnyxUpdate<RequestsKey> {
    return {onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS, value: {[key]: value}};
}

function getFailedState(requestID: string, errorKey: TranslationPaths): Partial<RequestState> {
    return {requestID, status: 'failed', errors: getMicroSecondOnyxErrorWithTranslationKey(errorKey)};
}

function addStatusUpdates(key: RequestKey, requestID: string, errorKey: TranslationPaths, onyxData: OnyxData<RequestOnyxKey>): OnyxData<RequestOnyxKey> {
    return {
        ...onyxData,
        optimisticData: [...(onyxData.optimisticData ?? []), buildStatusUpdate(key, {requestID, status: 'pending', errors: null})],
        successData: [...(onyxData.successData ?? []), buildStatusUpdate(key, {requestID, status: 'succeeded', errors: null})],
        failureData: [...(onyxData.failureData ?? []), buildStatusUpdate(key, getFailedState(requestID, errorKey))],

        // The handler goes on once the success or the failure data landed, so a retry may take over the entry before
        // this lands. Writing the request ID here would give the entry back to the older request and skip the retry.
        finallyData: [...(onyxData.finallyData ?? []), buildStatusUpdate(key, {answeredRequestID: requestID})],
    };
}

function sendRequest(request: MockRequest, onyxData: OnyxData<RequestOnyxKey>) {
    if (request.type === 'read') {
        read(request.command, request.params, onyxData);
        return;
    }
    write(request.command, request.params, onyxData);
}

function waitForRequestToSettle(key: RequestKey, requestID: string, errorKey: TranslationPaths): Promise<RequestOutcome> {
    return new Promise((resolve) => {
        let hasSeenRequest = false;

        // A request runs outside of render: the caller is an event handler that awaits the result before it navigates.
        // There is no component to subscribe with useOnyx, so the action listens to the key until its request settles.
        const connection = Onyx.connectWithoutView({
            key: ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS,
            callback: (requests) => {
                const entry = requests?.[key];
                if (entry?.requestID === requestID) {
                    hasSeenRequest = true;
                    if (entry.status === 'pending') {
                        // The answer applied neither the success nor the failure data, which the real API does when the command needs an admin.
                        // The entry would stay pending forever, so it is failed here and the next callback settles the request.
                        if (entry.answeredRequestID === requestID) {
                            Onyx.merge(ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS, {[key]: getFailedState(requestID, errorKey)});
                        }
                        return;
                    }
                    connection.unsubscribe();
                    resolve({status: entry.status});
                    return;
                }

                // A newer request with the same key or a reset of the lab replaced the entry, so this one has no result to report.
                if (hasSeenRequest) {
                    connection.unsubscribe();
                    resolve({status: 'skipped'});
                }
            },
        });
    });
}

/**
 * Reads made offline are dropped by the transport, so they are not sent at all. Writes made offline wait in a queue,
 * and so does their Promise, until the connection returns. A write whose key is still in flight is skipped.
 */
function runRequest(args: RunRequestArgs): Promise<RequestOutcome> {
    if (args.type === 'read' && getIsOffline()) {
        return Promise.resolve({status: 'skipped'});
    }
    const key = getRequestKey(args.name, args.scope);
    const isWrite = args.type === 'write';
    if (isWrite && writesInFlight.has(key)) {
        return Promise.resolve({status: 'skipped'});
    }
    if (isWrite) {
        writesInFlight.add(key);
    }
    const requestID = rand64();
    const errorKey = args.errorKey ?? 'common.genericErrorMessage';
    const settled = waitForRequestToSettle(key, requestID, errorKey);
    sendRequest(args, addStatusUpdates(key, requestID, errorKey, args.onyxData ?? {}));
    if (!isWrite) {
        return settled;
    }
    return settled.finally(() => writesInFlight.delete(key));
}

/** Describes a request without sending it, so a plan can name the request of a step and show its status */
function planRequest(args: RunRequestArgs): PlannedRequest {
    return {key: getRequestKey(args.name, args.scope), send: () => runRequest(args)};
}

/**
 * Describes a request whose params come from the page that sends it, such as the amounts of the test deposits. The key
 * comes from the name and the scope alone, so the page shows the status of the request before it sends anything.
 */
function planRequestWithInput<TInput>(identity: RequestIdentity, getRequest: (input: TInput) => MockRequest & RequestOptions): PlannedRequest<TInput> {
    return {key: getRequestKey(identity.name, identity.scope), send: (input) => runRequest({...getRequest(input), ...identity})};
}

/** Describes the read that a page needs, so the controller sends it when the page opens */
function planRead(args: RunRequestArgs & ReadRequest, isLoaded: boolean): PlannedRead {
    return {...planRequest(args), isLoaded};
}

export default runRequest;
export {planRead, planRequest, planRequestWithInput};
export type {RequestOnyxKey};
