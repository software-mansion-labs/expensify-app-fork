/**
 * The name sub page of one owner: the first and the last name on the flat draft keys of the owner. It shows the values
 * of the owner that the step resolved, and the title depends on whether the user enters their own data, like the real
 * `Name` sub page.
 */
import FullNameStep from '@components/SubStepForms/FullNameStep';

import useLocalize from '@hooks/useLocalize';

import useOnboardingStepFormSubmit from '@pages/SimplifiedBankOnboarding/hooks/useOnboardingStepFormSubmit';
import type BeneficialOwnerSubPageProps from '@pages/SimplifiedBankOnboarding/nonUSD/BeneficialOwnerInfo/types';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import {getOwnerInputID} from '@pages/SimplifiedBankOnboarding/utils/owners/OwnerDraftUtils';
import {OWNER_FIELDS} from '@pages/SimplifiedBankOnboarding/values/codecs/nonUSDBeneficialOwners';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

function Name({onNext, onMove, isEditing, ownerBeingModifiedID, ownerValues}: BeneficialOwnerSubPageProps) {
    const {translate} = useLocalize();

    const isUserEnteringOwnData = ownerBeingModifiedID === SBO_CONST.NON_USD.CURRENT_USER_KEY;
    const firstNameInputID = getOwnerInputID(ownerBeingModifiedID, OWNER_FIELDS.FIRST_NAME);
    const lastNameInputID = getOwnerInputID(ownerBeingModifiedID, OWNER_FIELDS.LAST_NAME);
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
