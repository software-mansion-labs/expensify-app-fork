import {act} from '@testing-library/react-native';

import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {OnboardingAccount} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import type {FlowData, RequestOutcome} from '@pages/SimplifiedBankOnboarding/core';

import CONST from '@src/CONST';

const TEST_POLICY_ID = '1';

type FlowDataSources = {
    draft?: OnboardingDraft;
    account?: OnboardingAccount;
    currency?: string;
};

/** The data of a flow as the answers, the rules and the requests of the steps get it */
function getTestFlowData({draft = {}, account, currency = SBO_CONST.CURRENCY.USD}: FlowDataSources = {}): FlowData {
    return {
        bankAccount: {policyID: TEST_POLICY_ID, bankAccountID: account?.achData?.bankAccountID ?? CONST.DEFAULT_NUMBER_ID},
        account,
        draft,
        currency,
    };
}

/** A request outcome that the test settles by hand, so it can choose the order in which overlapping requests answer */
type DeferredOutcome = {
    promise: Promise<RequestOutcome>;
    resolve: (outcome: RequestOutcome) => void;
    reject: (error: Error) => void;
};

function createDeferredOutcome(): DeferredOutcome {
    let resolve: (outcome: RequestOutcome) => void = () => {};
    let reject: (error: Error) => void = () => {};
    const promise = new Promise<RequestOutcome>((onResolve, onReject) => {
        resolve = onResolve;
        reject = onReject;
    });
    return {promise, resolve, reject};
}

/** Answers a deferred request and lets React apply what its callers do with the answer */
async function settle(deferred: DeferredOutcome, outcome: RequestOutcome) {
    await act(async () => {
        deferred.resolve(outcome);
        await deferred.promise;
    });
}

export {createDeferredOutcome, getTestFlowData, settle, TEST_POLICY_ID};
