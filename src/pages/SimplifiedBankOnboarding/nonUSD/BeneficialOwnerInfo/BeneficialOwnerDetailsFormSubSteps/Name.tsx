/**
 * The name sub page of one owner: a one-field form on the flat draft key of the owner. Its default value comes from the
 * draft only, like the real `Name` sub page.
 */
import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';
import SingleFieldStep from '@components/SubStepForms/SingleFieldStep';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';

import {getFieldRequiredErrors} from '@libs/ValidationUtils';

import useOnboardingStepFormSubmit from '@pages/SimplifiedBankOnboarding/hooks/useOnboardingStepFormSubmit';
import {OWNER_FIELDS} from '@pages/SimplifiedBankOnboarding/nonUSD/BeneficialOwnerInfo/const';
import type BeneficialOwnerSubPageProps from '@pages/SimplifiedBankOnboarding/nonUSD/BeneficialOwnerInfo/types';
import {getOwnerDraftValue, getOwnerInputID} from '@pages/SimplifiedBankOnboarding/utils/owners/OwnerDraftUtils';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

function Name({onNext, onMove, isEditing, ownerBeingModifiedID}: BeneficialOwnerSubPageProps) {
    const {translate} = useLocalize();
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);

    const fullNameInputID = getOwnerInputID(ownerBeingModifiedID, OWNER_FIELDS.FULL_NAME);
    const stepFields = [fullNameInputID];
    const defaultFullName = getOwnerDraftValue(draft, ownerBeingModifiedID, OWNER_FIELDS.FULL_NAME);

    const validate = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM>): FormInputErrors<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM> =>
        getFieldRequiredErrors(values, stepFields, translate);

    const handleSubmit = useOnboardingStepFormSubmit({fieldIds: stepFields, onNext, shouldSaveDraft: isEditing});

    return (
        <SingleFieldStep<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM>
            isEditing={isEditing}
            onNext={onNext}
            onMove={onMove}
            formID={ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM}
            formTitle={translate('ownershipInfoStep.whatsTheOwnersName')}
            validate={validate}
            onSubmit={handleSubmit}
            inputId={fullNameInputID}
            inputLabel={translate('ownershipInfoStep.legalName')}
            defaultValue={defaultFullName}
            shouldShowHelpLinks={false}
            shouldDelayAutoFocus
        />
    );
}

export default Name;
