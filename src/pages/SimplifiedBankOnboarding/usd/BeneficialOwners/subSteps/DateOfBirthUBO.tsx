/**
 * The date of birth sub page of one owner. Like the real `DateOfBirthUBO`, its default value comes from the draft only.
 */
import DateOfBirthStep from '@components/SubStepForms/DateOfBirthStep';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';

import useOnboardingStepFormSubmit from '@pages/SimplifiedBankOnboarding/hooks/useOnboardingStepFormSubmit';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import type BeneficialOwnerSubPageProps from '@pages/SimplifiedBankOnboarding/usd/BeneficialOwners/types';
import {getOwnerDraftValue, getOwnerInputID} from '@pages/SimplifiedBankOnboarding/utils/owners/OwnerDraftUtils';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

function DateOfBirthUBO({onNext, onMove, isEditing, beneficialOwnerBeingModifiedID}: BeneficialOwnerSubPageProps) {
    const {translate} = useLocalize();
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);

    const dobInputID = getOwnerInputID(beneficialOwnerBeingModifiedID, INPUT_IDS.DOB);
    const stepFields = [dobInputID];
    const dobDefaultValue = getOwnerDraftValue(draft, beneficialOwnerBeingModifiedID, INPUT_IDS.DOB);

    const handleSubmit = useOnboardingStepFormSubmit({fieldIds: stepFields, onNext, shouldSaveDraft: isEditing});

    return (
        <DateOfBirthStep<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM>
            isEditing={isEditing}
            onNext={onNext}
            onMove={onMove}
            formID={ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM}
            formTitle={translate('beneficialOwnerInfoStep.enterTheDateOfBirthOfTheOwner')}
            onSubmit={handleSubmit}
            stepFields={stepFields}
            dobInputID={dobInputID}
            dobDefaultValue={dobDefaultValue}
        />
    );
}

export default DateOfBirthUBO;
