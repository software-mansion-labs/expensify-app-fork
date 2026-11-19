/**
 * The agreements step of the USD flow. The real step splits it into a container and one sub page. Here it is one file,
 * because the step has one form with three required checkboxes. Each checkbox saves to the draft on change, the defaults
 * come from the draft and then from the server, and the submit waits for the answer with the shared `isLoading` (request
 * style 1).
 */
import CheckboxWithLabel from '@components/CheckboxWithLabel';
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';
import FormHelpMessage from '@components/FormHelpMessage';
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {getLatestErrorMessage} from '@libs/ErrorUtils';
import {isRequiredFulfilled} from '@libs/ValidationUtils';

import {acceptACHContract} from '@pages/SimplifiedBankOnboarding/actions/USDBankAccount';
import useOnboardingSubmitCallback from '@pages/SimplifiedBankOnboarding/hooks/useOnboardingSubmitCallback';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import {getBankAccountParams} from '@pages/SimplifiedBankOnboarding/utils/OnboardingAccountUtils';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

import type USDPageProps from './types';

type CompleteVerificationProps = Pick<USDPageProps, 'onSubmit' | 'onBackButtonPress' | 'stepNames' | 'startStepIndex'>;

function CompleteVerification({onSubmit, onBackButtonPress, stepNames, startStepIndex}: CompleteVerificationProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);
    const markSubmitting = useOnboardingSubmitCallback(onSubmit);

    const achData = account?.achData;
    const defaultValues = {
        isAuthorizedToUseBankAccount: draft?.isAuthorizedToUseBankAccount ?? achData?.isAuthorizedToUseBankAccount ?? false,
        certifyTrueInformation: draft?.certifyTrueInformation ?? achData?.certifyTrueInformation ?? false,
        acceptTermsAndConditions: draft?.acceptTermsAndConditions ?? achData?.acceptTermsAndConditions ?? false,
    };

    const validate = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM>): FormInputErrors<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM> => {
        const errors: FormInputErrors<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM> = {};
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

    const submit = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM>) => {
        acceptACHContract(getBankAccountParams(achData?.policyID, achData), {
            isAuthorizedToUseBankAccount: !!values.isAuthorizedToUseBankAccount,
            certifyTrueInformation: !!values.certifyTrueInformation,
            acceptTermsAndConditions: !!values.acceptTermsAndConditions,
        });
        markSubmitting();
    };

    return (
        <InteractiveStepWrapper
            wrapperID="SimplifiedBankOnboardingCompleteVerification"
            shouldEnablePickerAvoiding={false}
            shouldEnableMaxHeight
            headerTitle={translate('completeVerificationStep.completeVerification')}
            handleBackButtonPress={onBackButtonPress}
            startStepIndex={startStepIndex}
            stepNames={stepNames}
        >
            <FormProvider
                formID={ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM}
                validate={validate}
                onSubmit={submit}
                submitButtonText={translate('common.saveAndContinue')}
                style={[styles.mh5, styles.flexGrow1]}
                isLoading={!!account?.isLoading}
                enabledWhenOffline={false}
            >
                <Text style={styles.textHeadlineLineHeightXXL}>{translate('completeVerificationStep.confirmAgreements')}</Text>
                <InputWrapper
                    InputComponent={CheckboxWithLabel}
                    accessibilityLabel={translate('completeVerificationStep.isAuthorizedToUseBankAccount')}
                    label={translate('completeVerificationStep.isAuthorizedToUseBankAccount')}
                    inputID={INPUT_IDS.IS_AUTHORIZED_TO_USE_BANK_ACCOUNT}
                    style={styles.mt6}
                    defaultValue={defaultValues.isAuthorizedToUseBankAccount}
                    shouldSaveDraft
                />
                <InputWrapper
                    InputComponent={CheckboxWithLabel}
                    accessibilityLabel={translate('completeVerificationStep.certifyTrueAndAccurate')}
                    label={translate('completeVerificationStep.certifyTrueAndAccurate')}
                    inputID={INPUT_IDS.CERTIFY_TRUE_INFORMATION}
                    style={styles.mt6}
                    defaultValue={defaultValues.certifyTrueInformation}
                    shouldSaveDraft
                />
                <InputWrapper
                    InputComponent={CheckboxWithLabel}
                    accessibilityLabel={`${translate('common.iAcceptThe')} ${translate('completeVerificationStep.termsAndConditions')}`}
                    label={`${translate('common.iAcceptThe')} ${translate('completeVerificationStep.termsAndConditions')}`}
                    inputID={INPUT_IDS.ACCEPT_TERMS_AND_CONDITIONS}
                    style={styles.mt6}
                    defaultValue={defaultValues.acceptTermsAndConditions}
                    shouldSaveDraft
                />
                <FormHelpMessage
                    style={styles.mt3}
                    message={getLatestErrorMessage(account)}
                />
            </FormProvider>
        </InteractiveStepWrapper>
    );
}

export default CompleteVerification;
