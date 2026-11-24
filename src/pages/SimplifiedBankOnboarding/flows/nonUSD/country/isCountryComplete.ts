import {isGlobalAccountCreated} from '@pages/SimplifiedBankOnboarding/contract/setupStatus';
import type {FlowData} from '@pages/SimplifiedBankOnboarding/core';

/** Before the bank step created the account, the picked country lives only in the draft */
function isCountryComplete({account, draft}: FlowData): boolean {
    return isGlobalAccountCreated(account?.achData) || !!draft.country;
}

export default isCountryComplete;
