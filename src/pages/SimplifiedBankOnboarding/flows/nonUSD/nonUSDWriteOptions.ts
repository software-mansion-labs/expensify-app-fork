/**
 * What every NonUSD write shares. Today it is the defaults of the request layer only (the generic error message and no
 * extra Onyx data), but the NonUSD request files spread it into their RequestSpec, so a shared change has one place.
 */
import type {RequestSpec} from '@pages/SimplifiedBankOnboarding/core';

function getNonUSDWriteOptions(): Pick<RequestSpec, 'onyxData' | 'errorKey'> {
    return {errorKey: 'common.genericErrorMessage'};
}

export default getNonUSDWriteOptions;
