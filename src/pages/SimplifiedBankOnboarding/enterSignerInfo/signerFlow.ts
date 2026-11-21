/**
 * The flow of the page that an invited director opens from the email: one step with the signer details pages that the
 * NonUSD signer step also uses, saved by the request of the invited director. It has no custom steps and no counter.
 */
import type {FlowDescriptor} from '@pages/SimplifiedBankOnboarding/controller/types';
import getSignerDetailsPages from '@pages/SimplifiedBankOnboarding/formConfig/signer/getSignerDetailsPages';
import type {FlowPlan, PlanContext} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import {ENTER_SIGNER_INFO_STEP_ID} from '@pages/SimplifiedBankOnboarding/navigation/routes';
import {saveSignerDraft} from '@pages/SimplifiedBankOnboarding/requests/draft';
import getBankAccountParams from '@pages/SimplifiedBankOnboarding/requests/getBankAccountParams';
import {getSignerInfoRequest} from '@pages/SimplifiedBankOnboarding/requests/nonUSD/signerInfo';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

import ONYXKEYS from '@src/ONYXKEYS';

import type {SignerData} from './useSignerFlowData';

const SUB_PAGES = SBO_CONST.ENTER_SIGNER_INFO_SUB_PAGES;

function buildSignerPlan({draft, bankAccountID}: SignerData, {translate, policyID}: PlanContext): FlowPlan {
    const bankAccount = getBankAccountParams(policyID, {bankAccountID});
    const answers = {signerFullName: draft?.signerFullName ?? '', signerJobTitle: draft?.signerJobTitle ?? ''};

    return {
        answers,
        steps: [
            {
                id: ENTER_SIGNER_INFO_STEP_ID,
                title: translate('signerInfoStep.signerInfo'),
                isComplete: false,

                pages: getSignerDetailsPages({
                    pageIDs: {name: SUB_PAGES.NAME, jobTitle: SUB_PAGES.JOB_TITLE, confirmation: SUB_PAGES.CONFIRMATION},
                    answers,
                    shouldAskForName: true,
                    isConfirmationComplete: false,
                    request: getSignerInfoRequest(bankAccount, answers),
                    translate,
                }),
            },
        ],
    };
}

const signerFlow: FlowDescriptor<SignerData> = {
    wrapperID: 'SimplifiedBankOnboardingEnterSignerInfo',
    formID: ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM,
    saveDraft: saveSignerDraft,
    getStepNames: () => [],
    buildPlan: buildSignerPlan,
};

export default signerFlow;
