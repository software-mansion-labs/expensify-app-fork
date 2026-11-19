import type {FlowData, FlowDescriptor} from '@pages/SimplifiedBankOnboarding/controller/types';
import buildUSDPlan from '@pages/SimplifiedBankOnboarding/formConfig/usd/buildUSDPlan';
import {saveDraft} from '@pages/SimplifiedBankOnboarding/requests/draft';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import renderUSDCustomStep from '@pages/SimplifiedBankOnboarding/steps/usd/renderUSDCustomStep';

import ONYXKEYS from '@src/ONYXKEYS';

/** The USD flow for the shared controller: the plan of the USD steps and the screens of its custom pages */
const usdFlow: FlowDescriptor<FlowData> = {
    wrapperID: 'SimplifiedBankOnboardingUSDFlow',
    formID: ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM,
    saveDraft,
    getStepNames: () => SBO_CONST.USD.STEP_NAMES,
    buildPlan: (data, context) => buildUSDPlan(data.draft, data.account, context),
    renderCustomStep: renderUSDCustomStep,
};

export default usdFlow;
