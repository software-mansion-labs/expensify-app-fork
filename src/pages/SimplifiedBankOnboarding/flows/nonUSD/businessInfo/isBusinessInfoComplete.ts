import type {FlowData} from '@pages/SimplifiedBankOnboarding/core';

/** The server saves the company name with the step, so a saved name, also an empty one, means a saved step */
function isBusinessInfoComplete({account}: FlowData): boolean {
    return account?.achData?.corpay?.companyName !== undefined;
}

export default isBusinessInfoComplete;
