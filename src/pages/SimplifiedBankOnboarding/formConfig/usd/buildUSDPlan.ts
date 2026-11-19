import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {FlowPlan, PlanContext} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import getUSDAnswers from '@pages/SimplifiedBankOnboarding/model/answers/getUSDAnswers';
import getBankAccountParams from '@pages/SimplifiedBankOnboarding/requests/getBankAccountParams';
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

function getStepInput(draft: OnboardingDraft | undefined, account: OnyxEntry<OnboardingAccount>, policyID: string | undefined, translate: LocalizedTranslate): USDStepInput {
    const achData = account?.achData;
    const resolvedPolicyID = policyID ?? achData?.policyID;
    return {
        answers: getUSDAnswers(draft, account),
        account,
        achData,
        policyID: resolvedPolicyID,
        bankAccount: getBankAccountParams(resolvedPolicyID, achData),
        translate,
    };
}

/**
 * The USD flow as a plan. The identity check and the documents step are only in the plan while the server asks for
 * them, so no transition has to skip them.
 */
function buildUSDPlan(draft: OnboardingDraft | undefined, account: OnyxEntry<OnboardingAccount>, {translate, policyID}: PlanContext): FlowPlan {
    const input = getStepInput(draft, account, policyID, translate);
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
