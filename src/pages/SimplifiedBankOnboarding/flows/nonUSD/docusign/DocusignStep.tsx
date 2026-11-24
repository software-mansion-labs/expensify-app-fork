/**
 * The docusign step of the NonUSD flow, only for a currency that needs the signed authorization form. It ends the
 * setup with the agreement answers, the bank statement of the agreements step and this form.
 */
import FormProvider from '@components/Form/FormProvider';
import type {FormRef} from '@components/Form/types';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {isRequiredFulfilled} from '@libs/ValidationUtils';

import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import type {SubPageFormErrors} from '@pages/SimplifiedBankOnboarding/core';
import {OnboardingStep, RequestErrorMessage, useOnboardingFlow, useSubPageSubmit} from '@pages/SimplifiedBankOnboarding/core';
import finishOnboardingRequest from '@pages/SimplifiedBankOnboarding/flows/nonUSD/agreements/finishOnboardingRequest';
import {useNonUSDAnswers} from '@pages/SimplifiedBankOnboarding/flows/nonUSD/nonUSDAnswers';
import DraftFileInput from '@pages/SimplifiedBankOnboarding/flows/shared/files/DraftFileInput';

import CONST from '@src/CONST';

import React, {useRef} from 'react';

function DocusignPage() {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {formID} = useOnboardingFlow();
    const {achAuthorizationForm} = useNonUSDAnswers();
    const formRef = useRef<FormRef | null>(null);
    const {submit, isPending, errorMessage} = useSubPageSubmit({
        request: finishOnboardingRequest,
    });

    const validateForm = (values: OnboardingDraft): SubPageFormErrors =>
        isRequiredFulfilled(values.achAuthorizationForm ?? [])
            ? {}
            : {
                  [INPUT_IDS.ACH_AUTHORIZATION_FORM]: translate('common.error.fieldRequired'),
              };

    const submitForm = (values: OnboardingDraft) => submit({[INPUT_IDS.ACH_AUTHORIZATION_FORM]: values.achAuthorizationForm});

    return (
        <FormProvider
            ref={formRef}
            formID={formID}
            submitButtonText={translate('common.submit')}
            onSubmit={submitForm}
            validate={validateForm}
            style={[styles.mh5, styles.flexGrow1]}
            submitButtonStyles={[styles.mb0]}
            enabledWhenOffline={false}
            isLoading={isPending}
            footerContent={<RequestErrorMessage message={errorMessage} />}
            shouldRenderFooterAboveSubmit
        >
            <Text style={[styles.textHeadlineLineHeightXXL, styles.mb3]}>{translate('docusignStep.pleaseCompleteTheBusinessAccount')}</Text>
            <Text style={styles.mb5}>{translate('docusignStep.pleaseUploadTheDirect')}</Text>
            <DraftFileInput
                inputID={INPUT_IDS.ACH_AUTHORIZATION_FORM}
                defaultFiles={achAuthorizationForm}
                fileLimit={SBO_CONST.NON_USD.DOCUMENT_FILE_LIMIT}
                maxFileSize={CONST.CORPAY_DOCUMENT.MAX_FILE_SIZE}
                formRef={formRef}
            />
        </FormProvider>
    );
}

function DocusignStep() {
    const {translate} = useLocalize();

    return (
        <OnboardingStep
            title={translate('docusignStep.subheader')}
            wrapperID="SimplifiedBankOnboardingDocusign"
        >
            <DocusignPage />
        </OnboardingStep>
    );
}

export default DocusignStep;
