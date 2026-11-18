/**
 * The "Agreements" step of the non-USD bank account setup as a DynamicForm schema: one page of Corpay agreements the user must tick, and a bank statement
 * for the currencies that need one. Field keys are the draft keys of the bank account form, which the Docusign step reads when it sends them.
 */
import type {DynamicFormValues} from '@components/DynamicForm/types';

import requiresDocusignStep from '@pages/ReimbursementAccount/NonUSD/utils/requiresDocusignStep';

import CONST from '@src/CONST';
import INPUT_IDS from '@src/types/form/ReimbursementAccountForm';
import type {DynamicFormField, DynamicFormSchema} from '@src/types/onyx';
import type {Corpay} from '@src/types/onyx/ReimbursementAccount';

const KEYS = INPUT_IDS.ADDITIONAL_DATA.CORPAY;
const CORPAY_TERMS_URL = 'https://www.corpay.com/cross-border/terms';
const CORPAY_PRIVACY_POLICY_URL = 'https://www.corpay.com/privacy-policy';
const CURRENCIES_NEEDING_BANK_STATEMENT = new Set<string>([CONST.CURRENCY.AUD, CONST.CURRENCY.CAD]);

const bankStatementField: DynamicFormField = {
    key: KEYS.BANK_STATEMENT,
    type: 'file',
    required: true,
    labelKey: 'agreementsStep.bankStatement',
    descriptionKey: 'agreementsStep.bankStatementDescription',
};

function getAgreementsForm(currency: string | undefined) {
    return {
        pages: [
            {
                key: CONST.NON_USD_BANK_ACCOUNT.AGREEMENTS_STEP.SUB_PAGE_NAMES.CONFIRM_AGREEMENTS,
                titleKey: 'agreementsStep.pleaseConfirm',
                descriptionKey: requiresDocusignStep(currency) ? undefined : 'agreementsStep.regulationRequiresUs',
                content: [
                    {key: KEYS.AUTHORIZED_TO_BIND_CLIENT_TO_AGREEMENT, type: 'boolean', presentation: 'checkbox', required: true, labelKey: 'agreementsStep.iAmAuthorized'},
                    {key: KEYS.PROVIDE_TRUTHFUL_INFORMATION, type: 'boolean', presentation: 'checkbox', required: true, labelKey: 'agreementsStep.iCertify'},
                    {key: KEYS.AGREE_TO_TERMS_AND_CONDITIONS, type: 'boolean', presentation: 'checkbox', required: true, labelKey: 'common.acceptTermsAndConditions'},
                    {key: KEYS.CONSENT_TO_PRIVACY_NOTICE, type: 'boolean', presentation: 'checkbox', required: true, labelKey: 'agreementsStep.iConsentToThePrivacyNoticeAccessibility'},
                    {key: 'corpayTermsLink', url: CORPAY_TERMS_URL, textKey: 'completeVerificationStep.termsAndConditions'},
                    {key: 'corpayPrivacyPolicyLink', url: CORPAY_PRIVACY_POLICY_URL, textKey: 'common.privacyPolicy'},
                    ...(CURRENCIES_NEEDING_BANK_STATEMENT.has(currency ?? '') ? [bankStatementField] : []),
                ],
            },
        ],
    } satisfies DynamicFormSchema;
}

/** The agreements as the Corpay onboarding API takes them */
function getAgreementsParams(answers: DynamicFormValues): string {
    return JSON.stringify({
        [KEYS.PROVIDE_TRUTHFUL_INFORMATION]: answers[KEYS.PROVIDE_TRUTHFUL_INFORMATION] === true,
        [KEYS.AGREE_TO_TERMS_AND_CONDITIONS]: answers[KEYS.AGREE_TO_TERMS_AND_CONDITIONS] === true,
        [KEYS.CONSENT_TO_PRIVACY_NOTICE]: answers[KEYS.CONSENT_TO_PRIVACY_NOTICE] === true,
        [KEYS.AUTHORIZED_TO_BIND_CLIENT_TO_AGREEMENT]: answers[KEYS.AUTHORIZED_TO_BIND_CLIENT_TO_AGREEMENT] === true,
    });
}

/** The agreements the bank account already holds, under the form's draft keys */
function getAgreementsPrefill(corpay: Partial<Corpay> | undefined): DynamicFormValues {
    return {
        [KEYS.PROVIDE_TRUTHFUL_INFORMATION]: corpay?.[KEYS.PROVIDE_TRUTHFUL_INFORMATION],
        [KEYS.AGREE_TO_TERMS_AND_CONDITIONS]: corpay?.[KEYS.AGREE_TO_TERMS_AND_CONDITIONS],
        [KEYS.CONSENT_TO_PRIVACY_NOTICE]: corpay?.[KEYS.CONSENT_TO_PRIVACY_NOTICE],
        [KEYS.AUTHORIZED_TO_BIND_CLIENT_TO_AGREEMENT]: corpay?.[KEYS.AUTHORIZED_TO_BIND_CLIENT_TO_AGREEMENT],
    };
}

export default getAgreementsForm;
export {getAgreementsParams, getAgreementsPrefill};
