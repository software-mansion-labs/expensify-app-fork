/**
 * The docusign step of the NonUSD flow, only for AUD. It mirrors `NonUSD/Docusign` and `DocusignFullStep`: the signed form
 * lives in local state and in the draft, and the step sends the final request with the answers and the bank statement that
 * the agreements step collected. The mock server only receives the names of the files, because the real flow uploads them.
 */

import FormProvider from '@components/Form/FormProvider';
import type {FormInputErrors, FormOnyxValues, FormRef} from '@components/Form/types';
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {getFieldRequiredErrors} from '@libs/ValidationUtils';

import {clearFinishGlobalBankAccountOnboarding, finishGlobalBankAccountOnboarding} from '@pages/SimplifiedBankOnboarding/actions/GlobalBankAccount';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import {getBankAccountParams} from '@pages/SimplifiedBankOnboarding/utils/OnboardingAccountUtils';

import {clearErrors} from '@userActions/FormActions';

import ONYXKEYS from '@src/ONYXKEYS';
import type {FileObject} from '@src/types/utils/Attachment';

import React, {useEffect, useRef, useState} from 'react';

import type NonUSDPageProps from './types';

import DraftFileInput from './DraftFileInput';
import getAgreementValues from './getAgreementValues';

const STEP_FIELDS = [INPUT_IDS.ACH_AUTHORIZATION_FORM];

// The position of this step in the step counter of the header
const STEP_INDEX = 6;

function Docusign({onBackButtonPress, onSubmit, policyID, stepNames}: NonUSDPageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);
    const formRef = useRef<FormRef | null>(null);
    const isSubmittingRef = useRef(false);
    const [authorizationForms, setAuthorizationForms] = useState<FileObject[]>(draft?.achAuthorizationForm ?? []);

    const submit = () => {
        isSubmittingRef.current = true;
        finishGlobalBankAccountOnboarding(getBankAccountParams(policyID, account?.achData), {
            ...getAgreementValues(draft, account),
            bankStatementName: draft?.bankStatement?.at(0)?.name,
            achAuthorizationFormName: authorizationForms.at(0)?.name,
        });
    };

    useEffect(() => {
        if (account?.errors || account?.isFinishingCorpayBankAccountOnboarding || !account?.isSuccess) {
            return;
        }

        // The real step has no ref here; it keeps the ref of the other NonUSD steps so a stale `isSuccess` cannot skip it.
        if (isSubmittingRef.current) {
            isSubmittingRef.current = false;
            onSubmit();
            clearFinishGlobalBankAccountOnboarding();
        }
    }, [account?.errors, account?.isFinishingCorpayBankAccountOnboarding, account?.isSuccess, onSubmit]);

    const validate = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM>): FormInputErrors<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM> =>
        getFieldRequiredErrors(values, STEP_FIELDS, translate);

    const handleBackButtonPress = () => {
        clearErrors(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM);
        onBackButtonPress();
    };

    return (
        <InteractiveStepWrapper
            wrapperID="SimplifiedBankOnboardingDocusign"
            handleBackButtonPress={handleBackButtonPress}
            headerTitle={translate('docusignStep.subheader')}
            stepNames={stepNames}
            startStepIndex={STEP_INDEX}
        >
            <FormProvider
                ref={formRef}
                formID={ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM}
                submitButtonText={translate('common.submit')}
                onSubmit={submit}
                validate={validate}
                style={[styles.mh5, styles.flexGrow1]}
                submitButtonStyles={[styles.mb0]}
                enabledWhenOffline={false}
                isLoading={!!account?.isFinishingCorpayBankAccountOnboarding}
            >
                <Text style={[styles.textHeadlineLineHeightXXL, styles.mb3]}>{translate('docusignStep.pleaseCompleteTheBusinessAccount')}</Text>
                <Text style={styles.mb5}>{translate('docusignStep.pleaseUploadTheDirect')}</Text>
                <DraftFileInput
                    inputID={INPUT_IDS.ACH_AUTHORIZATION_FORM}
                    files={authorizationForms}
                    onFilesChange={setAuthorizationForms}
                    formRef={formRef}
                />
            </FormProvider>
        </InteractiveStepWrapper>
    );
}

export default Docusign;
