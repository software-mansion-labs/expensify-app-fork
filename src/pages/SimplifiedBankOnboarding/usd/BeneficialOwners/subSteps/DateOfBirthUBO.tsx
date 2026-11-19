/**
 * The date of birth sub page of one owner. It shows the value of the owner that the step resolved.
 */
import DateOfBirthStep from '@components/SubStepForms/DateOfBirthStep';

import useLocalize from '@hooks/useLocalize';

import useOnboardingStepFormSubmit from '@pages/SimplifiedBankOnboarding/hooks/useOnboardingStepFormSubmit';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import type BeneficialOwnerSubPageProps from '@pages/SimplifiedBankOnboarding/usd/BeneficialOwners/types';
import {getOwnerInputID} from '@pages/SimplifiedBankOnboarding/utils/owners/OwnerDraftUtils';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

function DateOfBirthUBO({onNext, onMove, isEditing, beneficialOwnerBeingModifiedID, ownerValues}: BeneficialOwnerSubPageProps) {
    const {translate} = useLocalize();

    const dobInputID = getOwnerInputID(beneficialOwnerBeingModifiedID, INPUT_IDS.DOB);
    const stepFields = [dobInputID];

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
            dobDefaultValue={ownerValues.dob}
        />
    );
}

export default DateOfBirthUBO;
