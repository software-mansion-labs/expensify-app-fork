import type {FieldConfig, StepConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import isFormPageComplete from '@pages/SimplifiedBankOnboarding/formConfig/validation/isFormPageComplete';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import getRequestKey from '@pages/SimplifiedBankOnboarding/requests/requestKey';
import acceptACHContract from '@pages/SimplifiedBankOnboarding/requests/usd/acceptACHContract';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

import type USDStepInput from './types';

import hasPassedServerStep from './hasPassedServerStep';

/** The three agreements that the user must accept before the server reviews the setup */
function getCompleteVerificationStep({answers, achData, bankAccount, translate}: USDStepInput): StepConfig {
    const termsLabel = `${translate('common.iAcceptThe')} ${translate('completeVerificationStep.termsAndConditions')}`;
    const fields: FieldConfig[] = [
        {
            type: 'checkbox',
            id: INPUT_IDS.IS_AUTHORIZED_TO_USE_BANK_ACCOUNT,
            label: translate('completeVerificationStep.isAuthorizedToUseBankAccount'),
            defaultValue: answers.isAuthorizedToUseBankAccount,
            isRequired: true,
            requiredErrorText: translate('completeVerificationStep.isAuthorizedToUseBankAccountError'),
        },
        {
            type: 'checkbox',
            id: INPUT_IDS.CERTIFY_TRUE_INFORMATION,
            label: translate('completeVerificationStep.certifyTrueAndAccurate'),
            defaultValue: answers.certifyTrueInformation,
            isRequired: true,
            requiredErrorText: translate('completeVerificationStep.certifyTrueAndAccurateError'),
        },
        {
            type: 'checkbox',
            id: INPUT_IDS.ACCEPT_TERMS_AND_CONDITIONS,
            label: termsLabel,
            defaultValue: answers.acceptTermsAndConditions,
            isRequired: true,
            requiredErrorText: translate('common.error.acceptTerms'),
        },
    ];

    return {
        id: SBO_CONST.USD.PAGE_NAMES.ACH_CONTRACT,
        title: translate('completeVerificationStep.completeVerification'),
        counterIndex: SBO_CONST.USD.STEP_INDEX.COMPLETE_VERIFICATION,
        isComplete: hasPassedServerStep(achData, SBO_CONST.USD.STEP.ACH_CONTRACT),
        pages: [
            {
                kind: 'form',
                id: SBO_CONST.USD.COMPLETE_VERIFICATION_SUB_PAGES.CONFIRM_AGREEMENTS,
                isComplete: isFormPageComplete(fields, translate),
                title: translate('completeVerificationStep.confirmAgreements'),
                fields,
                submitLabel: translate('common.saveAndContinue'),
            },
        ],
        submit: () =>
            acceptACHContract(bankAccount, {
                isAuthorizedToUseBankAccount: answers.isAuthorizedToUseBankAccount,
                certifyTrueInformation: answers.certifyTrueInformation,
                acceptTermsAndConditions: answers.acceptTermsAndConditions,
            }),
        requestKey: getRequestKey(REQUEST_NAMES.ACCEPT_ACH_CONTRACT, bankAccount),
    };
}

export default getCompleteVerificationStep;
