/**
 * The flow of the page that an invited director opens from the email: one step with the signer details pages that the
 * NonUSD signer step also uses, saved by the request of the invited director. It has no custom steps and no counter.
 */
import type {FlowDescriptor} from '@pages/SimplifiedBankOnboarding/controller/types';
import getSignerDetailsPages from '@pages/SimplifiedBankOnboarding/formConfig/signer/getSignerDetailsPages';
import type {FlowPlan, PlanContext} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import {ENTER_SIGNER_INFO_STEP_ID} from '@pages/SimplifiedBankOnboarding/navigation/routes';
import {saveSignerDraft} from '@pages/SimplifiedBankOnboarding/requests/draft';
import {saveSignerInfo} from '@pages/SimplifiedBankOnboarding/requests/nonUSD/signerInfo';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

import ONYXKEYS from '@src/ONYXKEYS';

import type {SignerData} from './useSignerFlowData';

const SUB_PAGES = SBO_CONST.ENTER_SIGNER_INFO_SUB_PAGES;
const NO_BANK_ACCOUNT_ID = 0;

function buildSignerPlan({draft, bankAccountID}: SignerData, {translate, policyID}: PlanContext): FlowPlan {
    const signerFullName = draft?.signerFullName ?? '';
    const signerJobTitle = draft?.signerJobTitle ?? '';
    const {formPages, confirmation} = getSignerDetailsPages({
        pageIDs: {name: SUB_PAGES.NAME, jobTitle: SUB_PAGES.JOB_TITLE, confirmation: SUB_PAGES.CONFIRMATION},
        fullName: signerFullName,
        jobTitle: signerJobTitle,
        shouldAskForName: true,
        isConfirmationComplete: false,
        translate,
    });
    return {
        steps: [
            {
                id: ENTER_SIGNER_INFO_STEP_ID,
                title: translate('signerInfoStep.signerInfo'),
                isComplete: false,
                pages: [
                    ...formPages,
                    {
                        ...confirmation,
                        submit: () => saveSignerInfo({policyID, bankAccountID: bankAccountID ?? NO_BANK_ACCOUNT_ID}, {signerFullName, signerJobTitle}),
                        requestName: REQUEST_NAMES.SAVE_SIGNER_INFO,
                    },
                ],
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
