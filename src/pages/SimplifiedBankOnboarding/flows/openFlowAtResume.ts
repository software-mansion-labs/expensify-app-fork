/**
 * Opens the bank account flow of a workspace where it resumes. The entry page and the verify account page call it from
 * their handlers with the data that the handler just wrote, so the plan already knows the setup type the user picked.
 */
import type {FlowData} from '@pages/SimplifiedBankOnboarding/controller/types';
import getResumePosition from '@pages/SimplifiedBankOnboarding/flow/resume';
import type {PlanContext} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import getNonUSDCurrency from '@pages/SimplifiedBankOnboarding/model/getNonUSDCurrency';
import {isNonUSDCurrency} from '@pages/SimplifiedBankOnboarding/model/setupStatus';
import {goToPosition, openFlow, replacePosition} from '@pages/SimplifiedBankOnboarding/navigation/flowNavigation';
import type {FlowRouteTarget} from '@pages/SimplifiedBankOnboarding/navigation/routes';

import type {Route} from '@src/ROUTES';

import nonUSDFlow from './nonUSDFlow';
import usdFlow from './usdFlow';

type OpenFlowOptions = {
    data: FlowData;
    context: PlanContext;
    backTo: Route | undefined;

    /** The page that opens the flow replaces itself, such as the verify account page */
    shouldReplace?: boolean;
};

function openFlowAtResume({data, context, backTo, shouldReplace = false}: OpenFlowOptions) {
    const {policyID} = context;
    const currency = getNonUSDCurrency(data.workspaces, policyID, data.account?.achData, data.draft);
    const isNonUSD = isNonUSDCurrency(currency);
    const target: FlowRouteTarget = {kind: isNonUSD ? 'nonUSD' : 'usd', policyID, backTo};
    const resumePosition = getResumePosition((isNonUSD ? nonUSDFlow : usdFlow).buildPlan(data, context));
    if (!resumePosition) {
        openFlow(target);
        return;
    }
    if (shouldReplace) {
        replacePosition(target, resumePosition);
        return;
    }
    goToPosition(target, resumePosition);
}

export default openFlowAtResume;
