/**
 * The agreements step of the USD flow: three required checkboxes that save themselves to the draft, and the write that
 * accepts them. The server answer decides the step that opens next: the company documents when the server asks for
 * them, else the validation. The page opens that step itself after it reads the answer, because the step after this one
 * changes only with the answer, after the press.
 */
import CheckboxWithLabel from '@components/CheckboxWithLabel';
import FormProvider from '@components/Form/FormProvider';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {isRequiredFulfilled} from '@libs/ValidationUtils';

import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import type {SubPageFormErrors} from '@pages/SimplifiedBankOnboarding/core';
import {OnboardingStep, RequestErrorMessage, SubPageInput, useOnboardingFlow, useOnboardingRequest} from '@pages/SimplifiedBankOnboarding/core';
import {useUSDAnswers} from '@pages/SimplifiedBankOnboarding/flows/usd/usdAnswers';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import {useNavigation} from '@react-navigation/native';
import React from 'react';
import Onyx from 'react-native-onyx';

import achContractRequest from './achContractRequest';

const {PAGE_NAMES} = SBO_CONST.USD;

function AgreementsPage() {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const navigation = useNavigation();
    const {formID, saveDraft, openStep} = useOnboardingFlow();
    const answers = useUSDAnswers();
    const {send, isPending, errorMessage} = useOnboardingRequest(achContractRequest);

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

    // The skip rule of the documents step changes with the answer, so the next step is read after it, and only while
    // this screen is still the one that the user looks at.
    function openStepAfterAnswer() {
        if (!navigation.isFocused()) {
            return;
        }
        Onyx.get(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT).then((account) => {
            openStep(account?.achData?.requiredKYBDocuments?.length ? PAGE_NAMES.KYB_DOCS : PAGE_NAMES.VALIDATION);
        });
    }

    const acceptAgreements = (values: OnboardingDraft) => {
        saveDraft({
            isAuthorizedToUseBankAccount: !!values.isAuthorizedToUseBankAccount,
            certifyTrueInformation: !!values.certifyTrueInformation,
            acceptTermsAndConditions: !!values.acceptTermsAndConditions,
        })
            .then(() => send())
            .then((outcome) => {
                if (outcome.status !== 'succeeded') {
                    return;
                }
                openStepAfterAnswer();
            });
    };

    return (
        <FormProvider
            formID={formID}
            validate={validateAgreements}
            onSubmit={acceptAgreements}
            submitButtonText={translate('common.saveAndContinue')}
            style={[styles.mh5, styles.flexGrow1]}
            isLoading={isPending}
            enabledWhenOffline={false}
            footerContent={<RequestErrorMessage message={errorMessage} />}
            shouldRenderFooterAboveSubmit
            sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SUBMIT_STEP}
        >
            <Text style={styles.textHeadlineLineHeightXXL}>{translate('completeVerificationStep.confirmAgreements')}</Text>
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
        </FormProvider>
    );
}

function CompleteVerificationStep() {
    const {translate} = useLocalize();

    return (
        <OnboardingStep
            title={translate('completeVerificationStep.completeVerification')}
            wrapperID="SimplifiedBankOnboardingCompleteVerification"
            shouldEnablePickerAvoiding={false}
            shouldEnableMaxHeight
        >
            <AgreementsPage />
        </OnboardingStep>
    );
}

export default CompleteVerificationStep;
