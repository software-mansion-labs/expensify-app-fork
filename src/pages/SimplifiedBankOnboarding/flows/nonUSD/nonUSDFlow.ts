import {clearDraftInputs, saveDraft} from '@pages/SimplifiedBankOnboarding/flows/shared/draft';
import type FlowData from '@pages/SimplifiedBankOnboarding/flows/shared/flowData/types';
import type {FlowDescriptor} from '@pages/SimplifiedBankOnboarding/flows/shared/plan/types';

import ONYXKEYS from '@src/ONYXKEYS';

import buildNonUSDPlan from './buildNonUSDPlan';
import NonUSDCustomStep from './customSteps/NonUSDCustomStep';

/** The NonUSD flow for the shared controller: the plan of the NonUSD steps and the screens of its custom pages */
const nonUSDFlow: FlowDescriptor<FlowData> = {
    wrapperID: 'SimplifiedBankOnboardingNonUSDFlow',
    formID: ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM,
    saveDraft,
    clearDraftInputs,
    buildPlan: buildNonUSDPlan,
    CustomStep: NonUSDCustomStep,
};

export default nonUSDFlow;
