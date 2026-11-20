/**
 * Builds the Onyx data of one tracked request. The state of the request lives under its own ID, so a step only waits for
 * the request that it sent. The account keeps `errors`, because the landing page and the entry point still show them.
 * A confirmed request also removes the fields of its step from the draft on success, because from then on the server
 * holds them. An action that writes more keys appends its own updates to each phase. A read only needs the status entry,
 * see `buildTrackedReadData`.
 */
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {OnboardingForm} from '@pages/SimplifiedBankOnboarding/types/form';

import ONYXKEYS from '@src/ONYXKEYS';
import type * as OnyxCommon from '@src/types/onyx/OnyxCommon';

import type {OnyxUpdate} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

type TrackedRequestKey =
    | typeof ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS
    | typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT
    | typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT;

/** The draft fields that a confirmed request saves. A background request passes none, see `useStepRequest`. */
type DraftFields = ReadonlyArray<keyof OnboardingForm>;

type TrackedRequestParams = {
    requestID: string;
    command: string;

    /** The error that the step and the account show when the request fails */
    errors: OnyxCommon.Errors;

    draftFieldsToClear?: DraftFields;
};

type TrackedRequestData = Record<'optimisticData' | 'successData' | 'failureData', Array<OnyxUpdate<TrackedRequestKey>>>;

type TrackedReadData = Record<'optimisticData' | 'successData' | 'failureData', Array<OnyxUpdate<typeof ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS>>>;

const {PENDING, SUCCEEDED, FAILED} = SBO_CONST.REQUEST_STATUS;

/** Builds only the status entry of a request, which is all that a read needs: its response replaces the data that it reads */
function buildTrackedReadData(requestID: string, command: string, errors: OnyxCommon.Errors): TrackedReadData {
    return {
        optimisticData: [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS, value: {[requestID]: {command, status: PENDING}}}],
        successData: [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS, value: {[requestID]: {status: SUCCEEDED}}}],
        failureData: [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS, value: {[requestID]: {status: FAILED, errors}}}],
    };
}

function buildTrackedRequestData({requestID, command, errors, draftFieldsToClear = []}: TrackedRequestParams): TrackedRequestData {
    const statusData = buildTrackedReadData(requestID, command, errors);
    const successData: Array<OnyxUpdate<TrackedRequestKey>> = [...statusData.successData];
    if (draftFieldsToClear.length > 0) {
        successData.push({
            onyxMethod: Onyx.METHOD.MERGE,
            key: ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT,
            value: Object.fromEntries(draftFieldsToClear.map((field) => [field, null])),
        });
    }

    return {
        optimisticData: [...statusData.optimisticData, {onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, value: {errors: null}}],
        successData,
        failureData: [...statusData.failureData, {onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, value: {errors}}],
    };
}

export default buildTrackedRequestData;
export {buildTrackedReadData};
export type {DraftFields, TrackedRequestKey};
