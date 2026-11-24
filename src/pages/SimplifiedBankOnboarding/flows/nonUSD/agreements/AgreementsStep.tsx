/**
 * The agreements step of the NonUSD flow. The checkboxes save themselves to the draft. When no docusign step follows,
 * the step ends the setup itself. Otherwise it also collects the bank statement, which the file input saves to the
 * draft, and the docusign step sends everything.
 */
import CheckboxWithLabel from '@components/CheckboxWithLabel';
import type {FormRef} from '@components/Form/types';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {isRequiredFulfilled} from '@libs/ValidationUtils';

import {requiresDocusignStep} from '@pages/SimplifiedBankOnboarding/contract/currency';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import type {BooleanInputID, OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import type {SubPageFormErrors} from '@pages/SimplifiedBankOnboarding/core';
import {FormSubPage, OnboardingStep, SubPageInput} from '@pages/SimplifiedBankOnboarding/core';
import {useNonUSDAnswers} from '@pages/SimplifiedBankOnboarding/flows/nonUSD/nonUSDAnswers';
import DraftFileInput from '@pages/SimplifiedBankOnboarding/flows/shared/files/DraftFileInput';

import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';

import React, {useRef} from 'react';

import finishOnboardingRequest from './finishOnboardingRequest';

/** The error of each checkbox that is not checked */
const AGREEMENT_ERRORS: Array<{
    inputID: BooleanInputID;
    errorPath: TranslationPaths;
}> = [
    {
        inputID: INPUT_IDS.AUTHORIZED_TO_BIND_CLIENT_TO_AGREEMENT,
        errorPath: 'agreementsStep.error.authorized',
    },
    {
        inputID: INPUT_IDS.AGREE_TO_TERMS_AND_CONDITIONS,
        errorPath: 'common.error.acceptTerms',
    },
    {
        inputID: INPUT_IDS.CONSENT_TO_PRIVACY_NOTICE,
        errorPath: 'agreementsStep.error.consent',
    },
];

function AgreementsStep() {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const answers = useNonUSDAnswers();
    const formRef = useRef<FormRef | null>(null);

    const isDocusignStepRequired = requiresDocusignStep(answers.currency);

    const validateAgreements = (values: OnboardingDraft): SubPageFormErrors => {
        const errors: SubPageFormErrors = {};
        for (const {inputID, errorPath} of AGREEMENT_ERRORS) {
            if (!values[inputID]) {
                errors[inputID] = translate(errorPath);
            }
        }
        if (isDocusignStepRequired && !isRequiredFulfilled(values.bankStatement)) {
            errors[INPUT_IDS.BANK_STATEMENT] = translate('common.error.fieldRequired');
        }
        return errors;
    };

    return (
        <OnboardingStep
            title={translate('agreementsStep.agreements')}
            wrapperID="SimplifiedBankOnboardingAgreements"
        >
            <FormSubPage
                ref={formRef}
                title={translate('agreementsStep.pleaseConfirm')}
                inputIDs={AGREEMENT_ERRORS.map(({inputID}) => inputID)}
                validate={validateAgreements}
                request={isDocusignStepRequired ? undefined : finishOnboardingRequest}
                submitButtonText={translate(isDocusignStepRequired ? 'common.confirm' : 'agreementsStep.accept')}
            >
                <SubPageInput
                    InputComponent={CheckboxWithLabel}
                    accessibilityLabel={translate('agreementsStep.iAmAuthorized')}
                    label={translate('agreementsStep.iAmAuthorized')}
                    inputID={INPUT_IDS.AUTHORIZED_TO_BIND_CLIENT_TO_AGREEMENT}
                    style={styles.mt6}
                    defaultValue={answers.authorizedToBindClientToAgreement}
                />
                <SubPageInput
                    InputComponent={CheckboxWithLabel}
                    accessibilityLabel={translate('agreementsStep.iAcceptTheTermsAndConditionsAccessibility')}
                    label={translate('agreementsStep.iAcceptTheTermsAndConditionsAccessibility')}
                    inputID={INPUT_IDS.AGREE_TO_TERMS_AND_CONDITIONS}
                    style={styles.mt6}
                    defaultValue={answers.agreeToTermsAndConditions}
                />
                <SubPageInput
                    InputComponent={CheckboxWithLabel}
                    accessibilityLabel={translate('agreementsStep.iConsentToThePrivacyNoticeAccessibility')}
                    label={translate('agreementsStep.iConsentToThePrivacyNoticeAccessibility')}
                    inputID={INPUT_IDS.CONSENT_TO_PRIVACY_NOTICE}
                    style={styles.mt6}
                    defaultValue={answers.consentToPrivacyNotice}
                />
                {isDocusignStepRequired && (
                    <>
                        <Text style={[styles.mutedTextLabel, styles.mt6, styles.mb3]}>{translate('agreementsStep.bankStatement')}</Text>
                        <DraftFileInput
                            inputID={INPUT_IDS.BANK_STATEMENT}
                            defaultFiles={answers.bankStatement}
                            fileLimit={SBO_CONST.NON_USD.DOCUMENT_FILE_LIMIT}
                            maxFileSize={CONST.CORPAY_DOCUMENT.MAX_FILE_SIZE}
                            formRef={formRef}
                        />
                        <Text style={[styles.mutedTextLabel, styles.mt3]}>{translate('agreementsStep.bankStatementDescription')}</Text>
                    </>
                )}
            </FormSubPage>
        </OnboardingStep>
    );
}

export default AgreementsStep;
