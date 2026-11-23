import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {clearDraftInputs, saveDraft} from '@pages/SimplifiedBankOnboarding/flows/shared/draft';
import type FlowData from '@pages/SimplifiedBankOnboarding/flows/shared/flowData/types';
import type {FlowDescriptor} from '@pages/SimplifiedBankOnboarding/flows/shared/plan/types';

import ONYXKEYS from '@src/ONYXKEYS';

import buildUSDPlan from './buildUSDPlan';
import USDCustomStep from './customSteps/USDCustomStep';

/** The USD flow for the shared controller: the plan of the USD steps and the screens of its custom pages */
const usdFlow: FlowDescriptor<FlowData> = {
    wrapperID: 'SimplifiedBankOnboardingUSDFlow',
    formID: ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM,
    saveDraft,
    clearDraftInputs,
    getStepNames: () => SBO_CONST.USD.STEP_NAMES,
    buildPlan: (data, context) => buildUSDPlan(data.draft, data.account, context),
    CustomStep: USDCustomStep,
};

export default usdFlow;
