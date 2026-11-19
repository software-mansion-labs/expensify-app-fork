/**
 * The company name sub page: a one-field form with a validator in the component. Like the real step, the default value
 * comes from the server data only, and the input locks once the server holds a name for an account past the review.
 */
import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';
import SingleFieldStep from '@components/SubStepForms/SingleFieldStep';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import type {SubPageProps} from '@hooks/useSubPage/types';

import {getFieldRequiredErrors, isValidCompanyName} from '@libs/ValidationUtils';

import useOnboardingStepFormSubmit from '@pages/SimplifiedBankOnboarding/hooks/useOnboardingStepFormSubmit';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

const STEP_FIELDS = [INPUT_IDS.COMPANY_NAME];

function Name({onNext, onMove, isEditing}: SubPageProps) {
    const {translate} = useLocalize();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);

    const defaultCompanyName = account?.achData?.companyName ?? '';
    const bankAccountState = account?.achData?.state ?? '';
    const shouldDisableCompanyName =
        !!account?.achData?.bankAccountID && !!defaultCompanyName && bankAccountState !== SBO_CONST.STATE.SETUP && bankAccountState !== SBO_CONST.STATE.VERIFYING;

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
