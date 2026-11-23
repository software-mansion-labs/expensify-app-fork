import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {requiresDocusignStep} from '@pages/SimplifiedBankOnboarding/contract/setupStatus';
import {clearDraftInputs, saveDraft} from '@pages/SimplifiedBankOnboarding/flows/shared/draft';
import type FlowData from '@pages/SimplifiedBankOnboarding/flows/shared/flowData/types';
import type {FlowDescriptor} from '@pages/SimplifiedBankOnboarding/flows/shared/plan/types';

import ONYXKEYS from '@src/ONYXKEYS';

import getNonUSDFlowState from './answers/getNonUSDFlowState';
import buildNonUSDPlan from './buildNonUSDPlan';
import NonUSDCustomStep from './customSteps/NonUSDCustomStep';

/** The NonUSD flow for the shared controller. The currency of the workspace decides whether the counter has the docusign step. */
const nonUSDFlow: FlowDescriptor<FlowData> = {
    wrapperID: 'SimplifiedBankOnboardingNonUSDFlow',
    formID: ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM,
    saveDraft,
    clearDraftInputs,
    getStepNames: (data, {policyID}) => {
        const {currency} = getNonUSDFlowState(data, policyID);
        return requiresDocusignStep(currency) ? SBO_CONST.NON_USD.DOCUSIGN_REQUIRED_STEP_NAMES : SBO_CONST.NON_USD.STEP_NAMES;
    },
    buildPlan: buildNonUSDPlan,
    CustomStep: NonUSDCustomStep,
};

export default nonUSDFlow;
