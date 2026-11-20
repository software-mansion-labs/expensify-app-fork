import type {FlowDescriptor} from '@pages/SimplifiedBankOnboarding/controller/types';
import buildNonUSDPlan from '@pages/SimplifiedBankOnboarding/formConfig/buildNonUSDPlan';
import getNonUSDFlowState from '@pages/SimplifiedBankOnboarding/model/getNonUSDFlowState';
import {requiresDocusignStep} from '@pages/SimplifiedBankOnboarding/model/setupStatus';
import type FlowData from '@pages/SimplifiedBankOnboarding/model/types';
import {clearDraftInputs, saveDraft} from '@pages/SimplifiedBankOnboarding/requests/draft';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import NonUSDCustomStep from '@pages/SimplifiedBankOnboarding/steps/nonUSD/NonUSDCustomStep';

import ONYXKEYS from '@src/ONYXKEYS';

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
