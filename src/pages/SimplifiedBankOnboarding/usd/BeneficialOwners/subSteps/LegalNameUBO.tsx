/**
 * The legal name sub page of one owner. Its inputs are the flat draft keys of the owner, and its default values come
 * from the draft only, like the real `LegalNameUBO`.
 */
import FullNameStep from '@components/SubStepForms/FullNameStep';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';

import useOnboardingStepFormSubmit from '@pages/SimplifiedBankOnboarding/hooks/useOnboardingStepFormSubmit';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import type BeneficialOwnerSubPageProps from '@pages/SimplifiedBankOnboarding/usd/BeneficialOwners/types';
import {getOwnerDraftValue, getOwnerInputID} from '@pages/SimplifiedBankOnboarding/utils/owners/OwnerDraftUtils';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

function LegalNameUBO({onNext, onMove, isEditing, beneficialOwnerBeingModifiedID}: BeneficialOwnerSubPageProps) {
    const {translate} = useLocalize();
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);

    const firstNameInputID = getOwnerInputID(beneficialOwnerBeingModifiedID, INPUT_IDS.FIRST_NAME);
    const lastNameInputID = getOwnerInputID(beneficialOwnerBeingModifiedID, INPUT_IDS.LAST_NAME);
    const stepFields = [firstNameInputID, lastNameInputID];
    const defaultValues = {
        firstName: getOwnerDraftValue(draft, beneficialOwnerBeingModifiedID, INPUT_IDS.FIRST_NAME),
        lastName: getOwnerDraftValue(draft, beneficialOwnerBeingModifiedID, INPUT_IDS.LAST_NAME),
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
