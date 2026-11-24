import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {OnboardingAccount} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import type {FlowData} from '@pages/SimplifiedBankOnboarding/core';

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

export {getTestFlowData, TEST_POLICY_ID};
