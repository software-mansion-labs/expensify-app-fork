/**
 * The business name sub page. Like the real one it takes its default value from the server data only, not from the draft.
 */
import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';
import SingleFieldStep from '@components/SubStepForms/SingleFieldStep';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import type {SubPageProps} from '@hooks/useSubPage/types';

import {getFieldRequiredErrors, isValidCompanyName} from '@libs/ValidationUtils';

import useOnboardingStepFormSubmit from '@pages/SimplifiedBankOnboarding/hooks/useOnboardingStepFormSubmit';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

const STEP_FIELDS = [INPUT_IDS.COMPANY_NAME];

function Name({onNext, onMove, isEditing}: SubPageProps) {
    const {translate} = useLocalize();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);

    const defaultValue = account?.achData?.corpay?.companyName ?? '';

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
            formTitle={translate('businessInfoStep.whatsTheBusinessName')}
            validate={validate}
            onSubmit={handleSubmit}
            inputId={INPUT_IDS.COMPANY_NAME}
            inputLabel={translate('businessInfoStep.legalBusinessName')}
            inputMode={CONST.INPUT_MODE.TEXT}
            defaultValue={defaultValue}
            shouldShowHelpLinks={false}
            shouldDelayAutoFocus
        />
    );
}

export default Name;
