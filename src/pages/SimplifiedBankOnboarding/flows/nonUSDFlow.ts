import type {FlowData, FlowDescriptor} from '@pages/SimplifiedBankOnboarding/controller/types';
import buildNonUSDPlan from '@pages/SimplifiedBankOnboarding/formConfig/nonUSD/buildNonUSDPlan';
import getNonUSDCurrency from '@pages/SimplifiedBankOnboarding/model/getNonUSDCurrency';
import {requiresDocusignStep} from '@pages/SimplifiedBankOnboarding/model/setupStatus';
import {openEnterSignerInfo} from '@pages/SimplifiedBankOnboarding/navigation/flowNavigation';
import {saveDraft} from '@pages/SimplifiedBankOnboarding/requests/draft';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import renderNonUSDCustomStep from '@pages/SimplifiedBankOnboarding/steps/nonUSD/renderNonUSDCustomStep';

import ONYXKEYS from '@src/ONYXKEYS';

/** The NonUSD flow for the shared controller. The currency of the workspace decides whether the counter has the docusign step. */
const nonUSDFlow: FlowDescriptor<FlowData> = {
    wrapperID: 'SimplifiedBankOnboardingNonUSDFlow',
    formID: ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM,
    saveDraft,
    getStepNames: ({workspaces, account, draft}, {policyID}) => {
        const achData = account?.achData;
        const currency = getNonUSDCurrency(workspaces, policyID ?? achData?.policyID, achData, draft);
        return requiresDocusignStep(currency) ? SBO_CONST.NON_USD.DOCUSIGN_REQUIRED_STEP_NAMES : SBO_CONST.NON_USD.STEP_NAMES;
    },
    buildPlan: buildNonUSDPlan,
    renderCustomStep: (props) => renderNonUSDCustomStep({...props, openSignerForm: openEnterSignerInfo}),
};

export default nonUSDFlow;
