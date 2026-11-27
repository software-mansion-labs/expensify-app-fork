/**
 * The agreements step of the USD flow: three required checkboxes that save themselves to the draft, and the write that
 * accepts them. The server answer decides the step that opens next: the company documents when the server asks for
 * them, else the validation. The step only moves on, and the flow skips the documents step from the data of the answer.
 */
import CheckboxWithLabel from '@components/CheckboxWithLabel';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {isRequiredFulfilled} from '@libs/ValidationUtils';

import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {SubPageFormErrors} from '@pages/SimplifiedBankOnboarding/core';
import {FormSubPage, OnboardingStep, SubPageInput, useFlowData} from '@pages/SimplifiedBankOnboarding/core';

import React from 'react';

import achContractRequest from './achContractRequest';
import getAgreementsAnswers from './getAgreementsAnswers';

function CompleteVerificationStep() {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const answers = getAgreementsAnswers(useFlowData());

    const acceptTermsLabel = `${translate('common.iAcceptThe')} ${translate('completeVerificationStep.termsAndConditions')}`;

    const validateAgreements = (values: OnboardingDraft): SubPageFormErrors => {
        const errors: SubPageFormErrors = {};
        if (!isRequiredFulfilled(values.acceptTermsAndConditions)) {
            errors.acceptTermsAndConditions = translate('common.error.acceptTerms');
        }
        if (!isRequiredFulfilled(values.certifyTrueInformation)) {
            errors.certifyTrueInformation = translate('completeVerificationStep.certifyTrueAndAccurateError');
        }
        if (!isRequiredFulfilled(values.isAuthorizedToUseBankAccount)) {
            errors.isAuthorizedToUseBankAccount = translate('completeVerificationStep.isAuthorizedToUseBankAccountError');
        }
        return errors;
    };

    return (
        <OnboardingStep
            title={translate('completeVerificationStep.completeVerification')}
            wrapperID="SimplifiedBankOnboardingCompleteVerification"
            shouldEnablePickerAvoiding={false}
            shouldEnableMaxHeight
        >
            <FormSubPage
                title={translate('completeVerificationStep.confirmAgreements')}
                inputIDs={[INPUT_IDS.IS_AUTHORIZED_TO_USE_BANK_ACCOUNT, INPUT_IDS.CERTIFY_TRUE_INFORMATION, INPUT_IDS.ACCEPT_TERMS_AND_CONDITIONS]}
                validate={validateAgreements}
                request={achContractRequest}
                submitButtonText={translate('common.saveAndContinue')}
            >
                <SubPageInput
                    InputComponent={CheckboxWithLabel}
                    accessibilityLabel={translate('completeVerificationStep.isAuthorizedToUseBankAccount')}
                    label={translate('completeVerificationStep.isAuthorizedToUseBankAccount')}
                    inputID={INPUT_IDS.IS_AUTHORIZED_TO_USE_BANK_ACCOUNT}
                    style={styles.mt6}
                    defaultValue={answers.isAuthorizedToUseBankAccount}
                />
                <SubPageInput
                    InputComponent={CheckboxWithLabel}
                    accessibilityLabel={translate('completeVerificationStep.certifyTrueAndAccurate')}
                    label={translate('completeVerificationStep.certifyTrueAndAccurate')}
                    inputID={INPUT_IDS.CERTIFY_TRUE_INFORMATION}
                    style={styles.mt6}
                    defaultValue={answers.certifyTrueInformation}
                />
                <SubPageInput
                    InputComponent={CheckboxWithLabel}
                    accessibilityLabel={acceptTermsLabel}
                    label={acceptTermsLabel}
                    inputID={INPUT_IDS.ACCEPT_TERMS_AND_CONDITIONS}
                    style={styles.mt6}
                    defaultValue={answers.acceptTermsAndConditions}
                />
            </FormSubPage>
        </OnboardingStep>
    );
}

export default CompleteVerificationStep;
