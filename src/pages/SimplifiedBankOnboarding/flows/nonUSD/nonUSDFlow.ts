import {clearDraftInputs, saveDraft} from '@pages/SimplifiedBankOnboarding/flows/shared/draft';
import type FlowData from '@pages/SimplifiedBankOnboarding/flows/shared/flowData/types';
import type {FlowDescriptor} from '@pages/SimplifiedBankOnboarding/flows/shared/plan/types';

import ONYXKEYS from '@src/ONYXKEYS';

import buildNonUSDPlan from './buildNonUSDPlan';

/** The NonUSD flow for the shared controller: its form and the plan of the NonUSD steps */
const nonUSDFlow: FlowDescriptor<FlowData> = {
    wrapperID: 'SimplifiedBankOnboardingNonUSDFlow',
    formID: ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM,
    saveDraft,
    clearDraftInputs,
    buildPlan: buildNonUSDPlan,
};

export default nonUSDFlow;
