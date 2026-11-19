import type {FlowData} from '@pages/SimplifiedBankOnboarding/controller/types';
import type {FlowPlan, PlanContext} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import {requiresDocusignStep} from '@pages/SimplifiedBankOnboarding/model/setupStatus';

import getAgreementsStep from './agreements';
import getBankInfoStep from './bankInfo';
import getBeneficialOwnerInfoStep from './beneficialOwners/getBeneficialOwnerInfoStep';
import getBusinessInfoStep from './businessInfo';
import getCountryStep from './country';
import getDocusignStep from './docusign';
import getFinishStep from './finish';
import getNonUSDStepInput from './getNonUSDStepInput';
import getSignerInfoStep from './signerInfo';

/** The NonUSD flow as a plan. The docusign step is only in the plan for the currencies that need a signed form. */
function buildNonUSDPlan(data: FlowData, context: PlanContext): FlowPlan {
    const input = getNonUSDStepInput(data, context);
    return {
        steps: [
            getCountryStep(input),
            getBankInfoStep(input),
            getBusinessInfoStep(input),
            getBeneficialOwnerInfoStep(input),
            getSignerInfoStep(input),
            getAgreementsStep(input),
            ...(requiresDocusignStep(input.currency) ? [getDocusignStep(input)] : []),
            getFinishStep(input),
        ],
    };
}

export default buildNonUSDPlan;
