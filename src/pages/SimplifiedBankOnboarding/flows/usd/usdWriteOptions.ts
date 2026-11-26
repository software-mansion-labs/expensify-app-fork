/**
 * What every USD write shares: the error message of a failure, and the failure data that drops the Plaid and identity
 * check tokens, so a retry asks the server for fresh ones. A request file spreads it into its RequestSpec.
 */
import type {RequestOnyxKey, RequestSpec} from '@pages/SimplifiedBankOnboarding/core';

import ONYXKEYS from '@src/ONYXKEYS';

import type {OnyxUpdate} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

type WriteOptions = Pick<RequestSpec, 'onyxData' | 'errorKey'>;

type USDWriteOptionsParams = {
    /** True for the requestor step, because a failed save there does not restart the identity check */
    shouldKeepOnfidoToken?: boolean;
};

function getUSDWriteOptions({shouldKeepOnfidoToken = false}: USDWriteOptionsParams = {}): WriteOptions {
    const failureData: Array<OnyxUpdate<RequestOnyxKey>> = [{onyxMethod: Onyx.METHOD.SET, key: ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_PLAID_LINK_TOKEN, value: null}];
    if (!shouldKeepOnfidoToken) {
        failureData.push({onyxMethod: Onyx.METHOD.SET, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ONFIDO_TOKEN, value: null});
    }

    return {onyxData: {failureData}, errorKey: 'walletPage.addBankAccountFailure'};
}

export default getUSDWriteOptions;
