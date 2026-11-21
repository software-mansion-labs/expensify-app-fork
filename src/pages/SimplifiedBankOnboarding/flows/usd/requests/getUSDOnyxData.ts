/**
 * The Onyx data that every USD write shares. A failure clears the Plaid link token and, outside the requestor step, the
 * identity check token, so the widgets start again on the next try. Both mirror `getVBBADataForOnyx` of the real flow.
 */
import type {USDStep} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import getAccountErrorOnyxData from '@pages/SimplifiedBankOnboarding/flows/shared/getAccountErrorOnyxData';

import ONYXKEYS from '@src/ONYXKEYS';
import type {OnyxData} from '@src/types/onyx/Request';

import type {OnyxUpdate} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

type USDOnyxKey =
    | typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT
    | typeof ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_PLAID_LINK_TOKEN
    | typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ONFIDO_TOKEN;

/** The USD writes show the same message for every failure, like the real flow */
const USD_ERROR_KEY = 'walletPage.addBankAccountFailure';

function getUSDOnyxData(step?: USDStep): OnyxData<USDOnyxKey> {
    const accountErrorData = getAccountErrorOnyxData(USD_ERROR_KEY);
    const failureData: Array<OnyxUpdate<USDOnyxKey>> = [
        ...(accountErrorData.failureData ?? []),
        {onyxMethod: Onyx.METHOD.SET, key: ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_PLAID_LINK_TOKEN, value: null},
    ];

    // A failed save of the requestor does not restart the identity check, so its token stays.
    if (step !== SBO_CONST.USD.STEP.REQUESTOR) {
        failureData.push({onyxMethod: Onyx.METHOD.SET, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ONFIDO_TOKEN, value: null});
    }

    return {optimisticData: accountErrorData.optimisticData, failureData};
}

export {USD_ERROR_KEY};
export default getUSDOnyxData;
