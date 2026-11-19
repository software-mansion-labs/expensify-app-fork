/* eslint-disable rulesdir/prefer-actions-set-data -- This file is the action layer of an isolated research module, so it lives outside src/libs/actions */
/**
 * Records a failed attempt of a request that the flow cannot send because an input it needs is missing, such as the
 * workspace of a bank account. The page then shows an error instead of a submit that does nothing.
 */
import {getMicroSecondOnyxErrorWithTranslationKey} from '@libs/ErrorUtils';
import {rand64} from '@libs/NumberUtils';

import type {TranslationPaths} from '@src/languages/types';
import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

import type {RequestName} from './REQUEST_NAMES';
import type {RequestOutcome} from './types';

async function failRequest(name: RequestName, errorKey: TranslationPaths = 'common.genericErrorMessage'): Promise<RequestOutcome> {
    await Onyx.merge(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_REQUESTS, {
        [name]: {requestID: rand64(), status: 'failed', errors: getMicroSecondOnyxErrorWithTranslationKey(errorKey)},
    });
    return {status: 'failed'};
}

export default failRequest;
