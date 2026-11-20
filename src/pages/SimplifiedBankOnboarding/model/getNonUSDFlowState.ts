/**
 * The NonUSD values that several layers derive from the same data: the workspace of the flow, its currency and the
 * answers. One helper keeps the plan, the step counter and the server list reads on the same country and currency.
 */
import type {NonUSDAnswers} from './answers/types';
import type FlowData from './types';

import getNonUSDAnswers from './answers/getNonUSDAnswers';
import getFlowPolicyID from './getFlowPolicyID';
import getNonUSDCurrency from './getNonUSDCurrency';

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
