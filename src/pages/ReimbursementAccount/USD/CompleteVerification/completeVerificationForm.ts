/**
 * The "Complete verification" step of the USD bank account setup as a DynamicForm schema: one page of agreements the user must tick.
 * The page key is the sub page name in the URL, and the field keys are the draft keys of the bank account form.
 */
import type {DynamicFormValues} from '@components/DynamicForm/types';

import CONST from '@src/CONST';
import INPUT_IDS from '@src/types/form/ReimbursementAccountForm';
import type {ACHContractStepProps} from '@src/types/form/ReimbursementAccountForm';
import type {DynamicFormSchema} from '@src/types/onyx';
import type {ACHData} from '@src/types/onyx/ReimbursementAccount';

const KEYS = INPUT_IDS.COMPLETE_VERIFICATION;

const completeVerificationForm = {
    pages: [
        {
            key: CONST.BANK_ACCOUNT.COMPLETE_VERIFICATION_STEP.SUB_PAGE_NAMES.CONFIRM_AGREEMENTS,
            titleKey: 'completeVerificationStep.confirmAgreements',
            content: [
                {key: KEYS.IS_AUTHORIZED_TO_USE_BANK_ACCOUNT, type: 'boolean', presentation: 'checkbox', required: true, labelKey: 'completeVerificationStep.isAuthorizedToUseBankAccount'},
                {key: KEYS.CERTIFY_TRUE_INFORMATION, type: 'boolean', presentation: 'checkbox', required: true, labelKey: 'completeVerificationStep.certifyTrueAndAccurate'},
                {key: KEYS.ACCEPT_TERMS_AND_CONDITIONS, type: 'boolean', presentation: 'checkbox', required: true, labelKey: 'common.acceptTermsAndConditions'},
                {key: 'achTermsLink', url: CONST.OLD_DOT_PUBLIC_URLS.ACH_TERMS_URL, textKey: 'completeVerificationStep.termsAndConditions'},
            ],
        },
    ],
} satisfies DynamicFormSchema;

function getCompleteVerificationParams(answers: DynamicFormValues): ACHContractStepProps {
    return {
        [KEYS.IS_AUTHORIZED_TO_USE_BANK_ACCOUNT]: answers[KEYS.IS_AUTHORIZED_TO_USE_BANK_ACCOUNT] === true,
        [KEYS.CERTIFY_TRUE_INFORMATION]: answers[KEYS.CERTIFY_TRUE_INFORMATION] === true,
        [KEYS.ACCEPT_TERMS_AND_CONDITIONS]: answers[KEYS.ACCEPT_TERMS_AND_CONDITIONS] === true,
    };
}

/** The agreements the bank account already holds, under the form's draft keys */
function getCompleteVerificationPrefill(achData: Pick<ACHData, keyof ACHContractStepProps | 'acceptTerms'> | undefined): DynamicFormValues {
    return {
        [KEYS.IS_AUTHORIZED_TO_USE_BANK_ACCOUNT]: achData?.[KEYS.IS_AUTHORIZED_TO_USE_BANK_ACCOUNT],
        [KEYS.CERTIFY_TRUE_INFORMATION]: achData?.[KEYS.CERTIFY_TRUE_INFORMATION],
        // The bank account keeps the accepted terms under a shorter name than the form
        [KEYS.ACCEPT_TERMS_AND_CONDITIONS]: achData?.acceptTerms,
    };
}

export default completeVerificationForm;
export {getCompleteVerificationParams, getCompleteVerificationPrefill};
