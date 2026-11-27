/**
 * The NonUSD values that every step of the plan builds on: the workspace of the flow, its currency and the answers. The
 * builder derives them once, so the steps and the reads of the server lists ask for the same country and currency.
 */
import getNonUSDCurrency from '@pages/SimplifiedBankOnboarding/contract/getNonUSDCurrency';
import getFlowPolicyID from '@pages/SimplifiedBankOnboarding/flows/shared/flowData/getFlowPolicyID';
import type FlowData from '@pages/SimplifiedBankOnboarding/flows/shared/flowData/types';

import type NonUSDAnswers from './NonUSDAnswers';

import getNonUSDAnswers from './getNonUSDAnswers';

type NonUSDFlowState = {
    /** The workspace of the URL, else the workspace of the server data */
    policyID: string | undefined;

    /** The currency of the workspace. It decides the countries, the steps and the server lists. */
    currency: string;
    answers: NonUSDAnswers;
};

/** The answers depend on the currency, which depends on the workspace, so they are derived in this order */
function getNonUSDFlowState({draft, account, workspaces}: Pick<FlowData, 'draft' | 'account' | 'workspaces'>, policyID: string | undefined): NonUSDFlowState {
    const achData = account?.achData;
    const flowPolicyID = getFlowPolicyID(policyID, achData);
    const currency = getNonUSDCurrency(workspaces, flowPolicyID, achData, draft);
    return {policyID: flowPolicyID, currency, answers: getNonUSDAnswers(draft, account, currency)};
}

export default getNonUSDFlowState;
export type {NonUSDFlowState};
