/**
 * The legal name sub page of one owner. Its inputs are the flat draft keys of the owner, and it shows the values of the
 * owner that the step resolved.
 */
import FullNameStep from '@components/SubStepForms/FullNameStep';

import useLocalize from '@hooks/useLocalize';

import useOnboardingStepFormSubmit from '@pages/SimplifiedBankOnboarding/hooks/useOnboardingStepFormSubmit';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import type BeneficialOwnerSubPageProps from '@pages/SimplifiedBankOnboarding/usd/BeneficialOwners/types';
import {getOwnerInputID} from '@pages/SimplifiedBankOnboarding/utils/owners/OwnerDraftUtils';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

function LegalNameUBO({onNext, onMove, isEditing, beneficialOwnerBeingModifiedID, ownerValues}: BeneficialOwnerSubPageProps) {
    const {translate} = useLocalize();

    const firstNameInputID = getOwnerInputID(beneficialOwnerBeingModifiedID, INPUT_IDS.FIRST_NAME);
    const lastNameInputID = getOwnerInputID(beneficialOwnerBeingModifiedID, INPUT_IDS.LAST_NAME);
    const stepFields = [firstNameInputID, lastNameInputID];
    const defaultValues = {
        firstName: ownerValues.firstName,
        lastName: ownerValues.lastName,
    };

    const handleSubmit = useOnboardingStepFormSubmit({fieldIds: stepFields, onNext, shouldSaveDraft: isEditing});

    return (
        <FullNameStep<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM>
            isEditing={isEditing}
            onNext={onNext}
            onMove={onMove}
            formID={ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM}
            formTitle={translate('beneficialOwnerInfoStep.enterLegalFirstAndLastName')}
            formSubtitle={translate('beneficialOwnerInfoStep.legalNameSubtitle')}
            onSubmit={handleSubmit}
            stepFields={stepFields}
            firstNameInputID={firstNameInputID}
            lastNameInputID={lastNameInputID}
            defaultValues={defaultValues}
            shouldShowHelpLinks={false}
        />
    );
}

export default LegalNameUBO;
