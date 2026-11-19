import type {FlowDescriptor} from '@pages/SimplifiedBankOnboarding/controller/types';
import buildNonUSDPlan from '@pages/SimplifiedBankOnboarding/formConfig/nonUSD/buildNonUSDPlan';
import getNonUSDCurrency from '@pages/SimplifiedBankOnboarding/model/getNonUSDCurrency';
import {requiresDocusignStep} from '@pages/SimplifiedBankOnboarding/model/setupStatus';
import {openEnterSignerInfo} from '@pages/SimplifiedBankOnboarding/navigation/flowNavigation';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import renderNonUSDCustomStep from '@pages/SimplifiedBankOnboarding/steps/nonUSD/renderNonUSDCustomStep';

/** The NonUSD flow for the shared controller. The currency of the workspace decides whether the counter has the docusign step. */
const nonUSDFlow: FlowDescriptor = {
    wrapperID: 'SimplifiedBankOnboardingNonUSDFlow',
    getStepNames: ({workspaces, account, draft}, {policyID}) => {
        const achData = account?.achData;
        const currency = getNonUSDCurrency(workspaces, policyID ?? achData?.policyID, achData, draft);
        return requiresDocusignStep(currency) ? SBO_CONST.NON_USD.DOCUSIGN_REQUIRED_STEP_NAMES : SBO_CONST.NON_USD.STEP_NAMES;
    },
    buildPlan: buildNonUSDPlan,
    renderCustomStep: (props) => renderNonUSDCustomStep({...props, openSignerForm: openEnterSignerInfo}),
};

export default nonUSDFlow;
