import type {FlowData} from '@pages/SimplifiedBankOnboarding/core';

/**
 * The step is saved once the server holds the answer about the owners. A setup with an empty company name never asks
 * for the owners again, like `getStartPageForContinueSetup` of the real flow.
 */
function areOwnersComplete({account}: FlowData): boolean {
    const corpay = account?.achData?.corpay;
    return !corpay?.companyName || corpay.anyIndividualOwn25PercentOrMore !== undefined;
}

export default areOwnersComplete;
