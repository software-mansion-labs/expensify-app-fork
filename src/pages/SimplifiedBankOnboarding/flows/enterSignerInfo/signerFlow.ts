/**
 * The flow of the page that an invited director opens from the email: one step with the signer details pages that the
 * NonUSD signer step also uses, saved by the request of the invited director. It has no custom steps and no counter.
 */
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import type {PlanContext} from '@pages/SimplifiedBankOnboarding/core';
import {saveSignerDraft} from '@pages/SimplifiedBankOnboarding/flows/shared/draft';
import getBankAccountParams from '@pages/SimplifiedBankOnboarding/flows/shared/getBankAccountParams';
import type {FlowDescriptor, FlowPlan} from '@pages/SimplifiedBankOnboarding/flows/shared/plan/types';
import {ENTER_SIGNER_INFO_STEP_ID} from '@pages/SimplifiedBankOnboarding/flows/shared/routes/flowRoutes';
import getSignerDetailsPages from '@pages/SimplifiedBankOnboarding/flows/shared/signerDetails/getSignerDetailsPages';
import getSignerInfoRequest from '@pages/SimplifiedBankOnboarding/flows/shared/signerDetails/getSignerInfoRequest';

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
                counter: 'none',
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
    buildPlan: buildSignerPlan,
};

export default signerFlow;
