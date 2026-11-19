/**
 * The agreements step of the NonUSD flow. It mirrors `NonUSD/Agreements` and `AgreementsFullStep`: the checkboxes save
 * themselves to the draft, and the step sends the final request itself only when the currency has no docusign step after
 * it. Otherwise the docusign step sends these answers together with its document, and this step also collects the bank
 * statement that the docusign step sends.
 */

import CheckboxWithLabel from '@components/CheckboxWithLabel';
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import type {FormInputErrors, FormOnyxValues, FormRef} from '@components/Form/types';
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {getFieldRequiredErrors} from '@libs/ValidationUtils';

import {clearFinishGlobalBankAccountOnboarding, finishGlobalBankAccountOnboarding} from '@pages/SimplifiedBankOnboarding/actions/GlobalBankAccount';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import {getBankAccountParams, requiresDocusignStep} from '@pages/SimplifiedBankOnboarding/utils/OnboardingAccountUtils';

import {clearErrors} from '@userActions/FormActions';

import ONYXKEYS from '@src/ONYXKEYS';
import type {FileObject} from '@src/types/utils/Attachment';

import React, {useEffect, useRef, useState} from 'react';

import type NonUSDPageProps from './types';

import DraftFileInput from './DraftFileInput';
import getAgreementValues from './getAgreementValues';

const STEP_FIELDS = [INPUT_IDS.AUTHORIZED_TO_BIND_CLIENT_TO_AGREEMENT, INPUT_IDS.AGREE_TO_TERMS_AND_CONDITIONS, INPUT_IDS.CONSENT_TO_PRIVACY_NOTICE];

function Agreements({onBackButtonPress, onSubmit, policyID, currency, stepNames, startStepIndex}: NonUSDPageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);

    const agreementValues = getAgreementValues(draft, account);
    const isDocusignStepRequired = requiresDocusignStep(currency);
    const isSubmittingRef = useRef(false);
    const formRef = useRef<FormRef | null>(null);
    const [bankStatements, setBankStatements] = useState<FileObject[]>(draft?.bankStatement ?? []);

    const submit = () => {
        if (isDocusignStepRequired) {
            onSubmit();
            return;
        }
        isSubmittingRef.current = true;
        finishGlobalBankAccountOnboarding(getBankAccountParams(policyID, account?.achData), agreementValues);
    };

    useEffect(() => {
        if (isDocusignStepRequired || account?.errors || account?.isFinishingCorpayBankAccountOnboarding || !account?.isSuccess) {
            return;
        }

        // The shared `isSuccess` can still be true from the previous step, so the ref tells whether this step sent the request.
        if (isSubmittingRef.current) {
            isSubmittingRef.current = false;
            onSubmit();
            clearFinishGlobalBankAccountOnboarding();
        }

        // As in the real step, this cleanup runs whenever a flag changes and not only on unmount, so it can clear a request that just started.
        return () => {
            clearFinishGlobalBankAccountOnboarding();
        };
    }, [account?.errors, account?.isFinishingCorpayBankAccountOnboarding, account?.isSuccess, isDocusignStepRequired, onSubmit]);

    const validate = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM>): FormInputErrors<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM> => {
        const errors = getFieldRequiredErrors(values, isDocusignStepRequired ? [...STEP_FIELDS, INPUT_IDS.BANK_STATEMENT] : STEP_FIELDS, translate);
        if (Object.hasOwn(errors, INPUT_IDS.AUTHORIZED_TO_BIND_CLIENT_TO_AGREEMENT)) {
            errors.authorizedToBindClientToAgreement = translate('agreementsStep.error.authorized');
        }
        if (Object.hasOwn(errors, INPUT_IDS.AGREE_TO_TERMS_AND_CONDITIONS)) {
            errors.agreeToTermsAndConditions = translate('common.error.acceptTerms');
        }
        if (Object.hasOwn(errors, INPUT_IDS.CONSENT_TO_PRIVACY_NOTICE)) {
            errors.consentToPrivacyNotice = translate('agreementsStep.error.consent');
        }
        return errors;
    };

    const handleBackButtonPress = () => {
        clearErrors(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM);
        onBackButtonPress();
    };

    return (
        <InteractiveStepWrapper
            wrapperID="SimplifiedBankOnboardingAgreements"
            handleBackButtonPress={handleBackButtonPress}
            headerTitle={translate('agreementsStep.agreements')}
            stepNames={stepNames}
            startStepIndex={startStepIndex}
        >
            <FormProvider
                ref={formRef}
                formID={ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM}
                onSubmit={submit}
                validate={validate}
                submitButtonText={translate(isDocusignStepRequired ? 'common.confirm' : 'agreementsStep.accept')}
                style={[styles.mh5, styles.flexGrow1]}
                enabledWhenOffline={false}
                isLoading={!!account?.isFinishingCorpayBankAccountOnboarding}
            >
                <Text style={styles.textHeadlineLineHeightXXL}>{translate('agreementsStep.pleaseConfirm')}</Text>
                <InputWrapper
                    InputComponent={CheckboxWithLabel}
                    accessibilityLabel={translate('agreementsStep.iAmAuthorized')}
                    label={translate('agreementsStep.iAmAuthorized')}
                    inputID={INPUT_IDS.AUTHORIZED_TO_BIND_CLIENT_TO_AGREEMENT}
                    style={styles.mt6}
                    defaultValue={agreementValues.authorizedToBindClientToAgreement}
                    shouldSaveDraft
                />
                <InputWrapper
                    InputComponent={CheckboxWithLabel}
                    accessibilityLabel={translate('agreementsStep.iAcceptTheTermsAndConditionsAccessibility')}
                    label={translate('agreementsStep.iAcceptTheTermsAndConditionsAccessibility')}
                    inputID={INPUT_IDS.AGREE_TO_TERMS_AND_CONDITIONS}
                    style={styles.mt6}
                    defaultValue={agreementValues.agreeToTermsAndConditions}
                    shouldSaveDraft
                />
                <InputWrapper
                    InputComponent={CheckboxWithLabel}
                    accessibilityLabel={translate('agreementsStep.iConsentToThePrivacyNoticeAccessibility')}
                    label={translate('agreementsStep.iConsentToThePrivacyNoticeAccessibility')}
                    inputID={INPUT_IDS.CONSENT_TO_PRIVACY_NOTICE}
                    style={styles.mt6}
                    defaultValue={agreementValues.consentToPrivacyNotice}
                    shouldSaveDraft
                />
                {isDocusignStepRequired && (
                    <>
                        <Text style={[styles.mutedTextLabel, styles.mt6, styles.mb3]}>{translate('agreementsStep.bankStatement')}</Text>
                        <DraftFileInput
                            inputID={INPUT_IDS.BANK_STATEMENT}
                            files={bankStatements}
                            onFilesChange={setBankStatements}
                            formRef={formRef}
                        />
                        <Text style={[styles.mutedTextLabel, styles.mt3]}>{translate('agreementsStep.bankStatementDescription')}</Text>
                    </>
                )}
            </FormProvider>
        </InteractiveStepWrapper>
    );
}

export default Agreements;
