/**
 * The name sub page of one owner: the first and the last name on the flat draft keys of the owner. Its default values
 * come from the draft only, and the title depends on whether the user enters their own data, like the real `Name` sub page.
 */
import FullNameStep from '@components/SubStepForms/FullNameStep';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';

import useOnboardingStepFormSubmit from '@pages/SimplifiedBankOnboarding/hooks/useOnboardingStepFormSubmit';
import {OWNER_FIELDS} from '@pages/SimplifiedBankOnboarding/nonUSD/BeneficialOwnerInfo/const';
import type BeneficialOwnerSubPageProps from '@pages/SimplifiedBankOnboarding/nonUSD/BeneficialOwnerInfo/types';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import {getOwnerDraftValue, getOwnerInputID} from '@pages/SimplifiedBankOnboarding/utils/owners/OwnerDraftUtils';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

function Name({onNext, onMove, isEditing, ownerBeingModifiedID}: BeneficialOwnerSubPageProps) {
    const {translate} = useLocalize();
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);

    const isUserEnteringOwnData = ownerBeingModifiedID === SBO_CONST.NON_USD.CURRENT_USER_KEY;
    const firstNameInputID = getOwnerInputID(ownerBeingModifiedID, OWNER_FIELDS.FIRST_NAME);
    const lastNameInputID = getOwnerInputID(ownerBeingModifiedID, OWNER_FIELDS.LAST_NAME);
    const stepFields = [firstNameInputID, lastNameInputID];
    const defaultValues = {
        firstName: getOwnerDraftValue(draft, ownerBeingModifiedID, OWNER_FIELDS.FIRST_NAME),
        lastName: getOwnerDraftValue(draft, ownerBeingModifiedID, OWNER_FIELDS.LAST_NAME),
    };

    const handleSubmit = useOnboardingStepFormSubmit({fieldIds: stepFields, onNext, shouldSaveDraft: isEditing});

    return (
        <FullNameStep<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM>
            isEditing={isEditing}
            onNext={onNext}
            onMove={onMove}
            formID={ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM}
            formTitle={translate(isUserEnteringOwnData ? 'ownershipInfoStep.whatsYourName' : 'ownershipInfoStep.whatsTheOwnersName')}
            formSubtitle={translate(isUserEnteringOwnData ? 'personalInfoStep.legalNameSubtitle' : 'beneficialOwnerInfoStep.legalNameSubtitle')}
            onSubmit={handleSubmit}
            stepFields={stepFields}
            firstNameInputID={firstNameInputID}
            lastNameInputID={lastNameInputID}
            defaultValues={defaultValues}
            shouldShowHelpLinks={false}
        />
    );
}

export default Name;
