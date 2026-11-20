/**
 * The one way the flow sends a request. It records the state of the request under its name in the request status key,
 * sends it through the mock API and returns a Promise that settles when the status of this very request leaves `pending`.
 * The status entry carries a request ID, so the result of an older request of the same name never settles a newer one.
 */
import {getMicroSecondOnyxErrorWithTranslationKey} from '@libs/ErrorUtils';
import {getIsOffline} from '@libs/NetworkState';
import {rand64} from '@libs/NumberUtils';

import {read, write} from '@pages/SimplifiedBankOnboarding/mockBackend/mockApi';
import type {RequestState} from '@pages/SimplifiedBankOnboarding/types/onyx';

import type {TranslationPaths} from '@src/languages/types';
import ONYXKEYS from '@src/ONYXKEYS';
import type {OnyxData} from '@src/types/onyx/Request';

import type {OnyxUpdate} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

import type {RequestName} from './REQUEST_NAMES';
import type {MockRequest, RequestOutcome} from './types';

type RequestsKey = typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_REQUESTS;

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

type RunRequestArgs = MockRequest & {
    name: RequestName;

    /** The updates of the request itself. The status updates are added to them. */
    onyxData?: OnyxData<RequestOnyxKey>;

    /** The message that the status entry shows when the request fails */
    errorKey?: TranslationPaths;
};

function buildStatusUpdate(name: RequestName, value: Partial<RequestState>): OnyxUpdate<RequestsKey> {
    return {onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_REQUESTS, value: {[name]: value}};
}

function withStatusUpdates(name: RequestName, requestID: string, errorKey: TranslationPaths, onyxData: OnyxData<RequestOnyxKey>): OnyxData<RequestOnyxKey> {
    return {
        ...onyxData,
        optimisticData: [...(onyxData.optimisticData ?? []), buildStatusUpdate(name, {requestID, status: 'pending', errors: null})],
        successData: [...(onyxData.successData ?? []), buildStatusUpdate(name, {requestID, status: 'succeeded', errors: null})],
        failureData: [...(onyxData.failureData ?? []), buildStatusUpdate(name, {requestID, status: 'failed', errors: getMicroSecondOnyxErrorWithTranslationKey(errorKey)})],
    };
}

function sendRequest(request: MockRequest, onyxData: OnyxData<RequestOnyxKey>) {
    if (request.type === 'read') {
        read(request.command, request.params, onyxData);
        return;
    }
    write(request.command, request.params, onyxData);
}

function waitForRequestToSettle(name: RequestName, requestID: string): Promise<RequestOutcome> {
    return new Promise((resolve) => {
        let hasSeenRequest = false;

        // A request runs outside of render: the caller is an event handler that awaits the result before it navigates.
        // There is no component to subscribe with useOnyx, so the action listens to the key until its request settles.
        const connection = Onyx.connectWithoutView({
            key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_REQUESTS,
            callback: (requests) => {
                const entry = requests?.[name];
                if (entry?.requestID === requestID) {
                    hasSeenRequest = true;
                    if (entry.status === 'pending') {
                        return;
                    }
                    connection.unsubscribe();
                    resolve({status: entry.status});
                    return;
                }

                // A newer request of the same name or a reset of the lab replaced the entry, so this one has no result to report.
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
 * and so does their Promise, until the connection returns.
 */
function runRequest(args: RunRequestArgs): Promise<RequestOutcome> {
    if (args.type === 'read' && getIsOffline()) {
        return Promise.resolve({status: 'skipped'});
    }
    const requestID = rand64();
    const settled = waitForRequestToSettle(args.name, requestID);
    sendRequest(args, withStatusUpdates(args.name, requestID, args.errorKey ?? 'common.genericErrorMessage', args.onyxData ?? {}));
    return settled;
}

export default runRequest;
export type {RequestOnyxKey};
