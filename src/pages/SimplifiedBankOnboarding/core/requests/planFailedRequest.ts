/* eslint-disable rulesdir/prefer-actions-set-data -- This file is the action layer of an isolated research module, so it lives outside src/libs/actions */
/**
 * The request of a step that the flow cannot send because an input it needs is missing, such as the workspace of a bank
 * account. Sending it only records a failed attempt, so the page shows an error instead of a submit that does nothing.
 */
import {getMicroSecondOnyxErrorWithTranslationKey} from '@libs/ErrorUtils';
import {rand64} from '@libs/NumberUtils';

import type {RequestName} from '@pages/SimplifiedBankOnboarding/contract/REQUEST_NAMES';

import type {TranslationPaths} from '@src/languages/types';
import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

import type {RequestKey, RequestScope} from './requestKey';
import type {PlannedRequest, RequestOutcome} from './types';

import getRequestKey from './requestKey';

async function failRequest(key: RequestKey, errorKey: TranslationPaths = 'common.genericErrorMessage'): Promise<RequestOutcome> {
    await Onyx.merge(ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS, {
        [key]: {requestID: rand64(), status: 'failed', errors: getMicroSecondOnyxErrorWithTranslationKey(errorKey)},
    });
    return {status: 'failed'};
}

function planFailedRequest(name: RequestName, scope?: RequestScope): PlannedRequest {
    const key = getRequestKey(name, scope);
    return {key, send: () => failRequest(key)};
}

export default planFailedRequest;
