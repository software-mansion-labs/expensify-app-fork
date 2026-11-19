/**
 * The agreements step. Without a docusign step after it, the step sends the final request itself. For AUD it also
 * collects the bank statement, and the docusign step sends both together with the signed form.
 */
import getCorpayFileField from '@pages/SimplifiedBankOnboarding/formConfig/fields/getCorpayFileField';
import type {CheckboxFieldConfig, FieldConfig, StepConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import isFormPageComplete from '@pages/SimplifiedBankOnboarding/formConfig/validation/isFormPageComplete';
import finishGlobalOnboarding from '@pages/SimplifiedBankOnboarding/requests/nonUSD/finishGlobalOnboarding';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

import type NonUSDStepInput from './types';

import getAgreementDetails from './getAgreementDetails';
import isOnboardingSent from './isOnboardingSent';

function getAgreementFields({answers, isAUD, translate}: NonUSDStepInput): FieldConfig[] {
    const checkboxes: CheckboxFieldConfig[] = [
        {
            type: 'checkbox',
            id: INPUT_IDS.AUTHORIZED_TO_BIND_CLIENT_TO_AGREEMENT,
            label: translate('agreementsStep.iAmAuthorized'),
            defaultValue: answers.authorizedToBindClientToAgreement,
            isRequired: true,
            requiredErrorText: translate('agreementsStep.error.authorized'),
        },
        {
            type: 'checkbox',
            id: INPUT_IDS.AGREE_TO_TERMS_AND_CONDITIONS,
            label: translate('agreementsStep.iAcceptTheTermsAndConditionsAccessibility'),
            defaultValue: answers.agreeToTermsAndConditions,
            isRequired: true,
            requiredErrorText: translate('common.error.acceptTerms'),
        },
        {
            type: 'checkbox',
            id: INPUT_IDS.CONSENT_TO_PRIVACY_NOTICE,
            label: translate('agreementsStep.iConsentToThePrivacyNoticeAccessibility'),
            defaultValue: answers.consentToPrivacyNotice,
            isRequired: true,
            requiredErrorText: translate('agreementsStep.error.consent'),
        },
    ];
    if (!isAUD) {
        return checkboxes;
    }
    return [
        ...checkboxes,
        getCorpayFileField(INPUT_IDS.BANK_STATEMENT, translate('agreementsStep.bankStatement'), translate('agreementsStep.bankStatementDescription'), answers.bankStatement),
    ];
}

function getAgreementsStep(input: NonUSDStepInput): StepConfig {
    const {answers, achData, isAUD, bankAccount, translate} = input;
    const fields = getAgreementFields(input);
    const isSent = isOnboardingSent(achData);
    const isComplete = isSent || (isAUD && isFormPageComplete(fields, translate));
    return {
        id: SBO_CONST.NON_USD.PAGE_NAMES.AGREEMENTS,
        title: translate('agreementsStep.agreements'),
        counterIndex: 5,
        isComplete,
        pages: [
            {
                kind: 'form',
                id: SBO_CONST.NON_USD.AGREEMENTS_SUB_PAGES.CONFIRM_AGREEMENTS,
                isComplete,
                title: translate('agreementsStep.pleaseConfirm'),
                fields,
                submitLabel: translate(isAUD ? 'common.confirm' : 'agreementsStep.accept'),
                enabledWhenOffline: false,
            },
        ],
        ...(isAUD ? {} : {submit: () => finishGlobalOnboarding(bankAccount, getAgreementDetails(answers)), requestName: REQUEST_NAMES.FINISH_GLOBAL_ONBOARDING}),
    };
}

export default getAgreementsStep;
