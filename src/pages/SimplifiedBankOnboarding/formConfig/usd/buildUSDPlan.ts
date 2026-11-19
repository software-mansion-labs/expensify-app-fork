/**
 * Builds the whole USD plan from the draft and the server data. It is the one place that decides which steps the USD
 * flow has, so the controller never skips a step on its own.
 */
import getBaseStepInput from '@pages/SimplifiedBankOnboarding/formConfig/getBaseStepInput';
import type {FlowPlan, PlanContext} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import getUSDAnswers from '@pages/SimplifiedBankOnboarding/model/answers/getUSDAnswers';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/types/form';
import type {OnboardingAccount} from '@pages/SimplifiedBankOnboarding/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

import type USDStepInput from './types';

import getBankAccountStep from './bankAccount';
import getBeneficialOwnersStep from './beneficialOwners/getBeneficialOwnersStep';
import getBusinessInfoStep from './businessInfo';
import getCompleteVerificationStep from './completeVerification';
import getCountryStep from './country';
import getKYBDocumentsStep from './kybDocuments';
import getPersonalInfoStep from './personalInfo';
import getValidationStep from './validation';
import getVerifyIdentityStep from './verifyIdentity';

/**
 * The USD flow as a plan. The identity check and the documents step are only in the plan while the server asks for
 * them, so no transition has to skip them.
 */
function buildUSDPlan(draft: OnboardingDraft | undefined, account: OnyxEntry<OnboardingAccount>, {translate, policyID}: PlanContext): FlowPlan {
    const input: USDStepInput = {...getBaseStepInput(account, policyID, translate), answers: getUSDAnswers(draft, account)};
    const requiredDocuments = input.achData?.requiredKYBDocuments ?? [];

    return {
        steps: [
            getCountryStep(input),
            getBankAccountStep(input),
            getPersonalInfoStep(input),
            ...(input.achData?.isOnfidoSetupComplete ? [] : [getVerifyIdentityStep(input)]),
            getBusinessInfoStep(input),
            getBeneficialOwnersStep(input),
            getCompleteVerificationStep(input),
            ...(requiredDocuments.length > 0 ? [getKYBDocumentsStep(input, requiredDocuments)] : []),
            getValidationStep(input),
        ],
    };
}

export default buildUSDPlan;
