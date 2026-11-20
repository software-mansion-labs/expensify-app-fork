/**
 * The company name sub page: a one-field form with a validator in the component. Like the real step, the input locks once
 * the account is past the review and a name is saved.
 */
import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';
import SingleFieldStep from '@components/SubStepForms/SingleFieldStep';

import useLocalize from '@hooks/useLocalize';

import {getFieldRequiredErrors, isValidCompanyName} from '@libs/ValidationUtils';

import useOnboardingStepFormSubmit from '@pages/SimplifiedBankOnboarding/hooks/useOnboardingStepFormSubmit';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import type BusinessInfoSubPageProps from '@pages/SimplifiedBankOnboarding/usd/BusinessInfo/types';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

const STEP_FIELDS = [INPUT_IDS.COMPANY_NAME];

function Name({onNext, onMove, isEditing, values: stepValues, isLocked}: BusinessInfoSubPageProps) {
    const {translate} = useLocalize();

    const defaultCompanyName = stepValues.companyName;
    const shouldDisableCompanyName = isLocked && !!defaultCompanyName;

    const validate = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM>): FormInputErrors<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM> => {
        const errors = getFieldRequiredErrors(values, STEP_FIELDS, translate);
        if (values.companyName && !isValidCompanyName(values.companyName)) {
            errors.companyName = translate('bankAccount.error.companyName');
        }
        return errors;
    };

    const handleSubmit = useOnboardingStepFormSubmit({fieldIds: STEP_FIELDS, onNext, shouldSaveDraft: isEditing});

    return (
        <SingleFieldStep<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM>
            isEditing={isEditing}
            onNext={onNext}
            onMove={onMove}
            formID={ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM}
            formTitle={translate('businessInfoStep.enterTheNameOfYourBusiness')}
            validate={validate}
            onSubmit={handleSubmit}
            inputId={INPUT_IDS.COMPANY_NAME}
            inputLabel={translate('businessInfoStep.businessName')}
            defaultValue={defaultCompanyName}
            shouldUseDefaultValue={shouldDisableCompanyName}
            disabled={shouldDisableCompanyName}
            shouldShowHelpLinks={false}
            shouldDelayAutoFocus
        />
    );
}

export default Name;
