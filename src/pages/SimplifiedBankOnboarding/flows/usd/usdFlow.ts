import {clearDraftInputs, saveDraft} from '@pages/SimplifiedBankOnboarding/flows/shared/draft';
import type FlowData from '@pages/SimplifiedBankOnboarding/flows/shared/flowData/types';
import type {FlowDescriptor} from '@pages/SimplifiedBankOnboarding/flows/shared/plan/types';

import ONYXKEYS from '@src/ONYXKEYS';

import buildUSDPlan from './buildUSDPlan';

/** The USD flow for the shared controller: its form and the plan of the USD steps */
const usdFlow: FlowDescriptor<FlowData> = {
    wrapperID: 'SimplifiedBankOnboardingUSDFlow',
    formID: ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM,
    saveDraft,
    clearDraftInputs,
    buildPlan: buildUSDPlan,
};

export default usdFlow;
