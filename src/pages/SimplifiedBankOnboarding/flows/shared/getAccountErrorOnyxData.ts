import {getMicroSecondOnyxErrorWithTranslationKey} from '@libs/ErrorUtils';

import type {TranslationPaths} from '@src/languages/types';
import ONYXKEYS from '@src/ONYXKEYS';
import type {OnyxData} from '@src/types/onyx/Request';

import Onyx from 'react-native-onyx';

type AccountKey = typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT;

/**
 * The frozen Payments page shows an error line while the account key has errors. The flow reads its errors from the
 * request status key, and the writes of the flow keep this account error only for that page.
 */
function getAccountErrorOnyxData(errorKey: TranslationPaths): OnyxData<AccountKey> {
    return {
        optimisticData: [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, value: {errors: null}}],
        failureData: [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, value: {errors: getMicroSecondOnyxErrorWithTranslationKey(errorKey)}}],
    };
}

export default getAccountErrorOnyxData;
