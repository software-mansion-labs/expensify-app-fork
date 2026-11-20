/**
 * The ownership sub page of one owner. Its validator needs the shares of the other owners, which the details form
 * passes in, so that each owner has at least 25% and the total stays at 100 or below, like the real sub page.
 */
import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';
import SingleFieldStep from '@components/SubStepForms/SingleFieldStep';

import useLocalize from '@hooks/useLocalize';

import {getFieldRequiredErrors, isValidOwnershipPercentage} from '@libs/ValidationUtils';

import useOnboardingStepFormSubmit from '@pages/SimplifiedBankOnboarding/hooks/useOnboardingStepFormSubmit';
import type BeneficialOwnerSubPageProps from '@pages/SimplifiedBankOnboarding/nonUSD/BeneficialOwnerInfo/types';
import {getOwnerInputID} from '@pages/SimplifiedBankOnboarding/utils/owners/OwnerDraftUtils';
import {OWNER_FIELDS} from '@pages/SimplifiedBankOnboarding/values/codecs/nonUSDBeneficialOwners';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

function OwnershipPercentage({onNext, onMove, isEditing, ownerBeingModifiedID, ownerValues, totalOwnedPercentage}: BeneficialOwnerSubPageProps) {
    const {translate} = useLocalize();

    const ownershipPercentageInputID = getOwnerInputID(ownerBeingModifiedID, OWNER_FIELDS.OWNERSHIP_PERCENTAGE);
    const stepFields = [ownershipPercentageInputID];

    const validate = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM>): FormInputErrors<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM> => {
        const errors = getFieldRequiredErrors(values, stepFields, translate);
        const ownershipPercentage = values[ownershipPercentageInputID];
        if (ownershipPercentage && !isValidOwnershipPercentage(ownershipPercentage, totalOwnedPercentage, ownerBeingModifiedID)) {
            errors[ownershipPercentageInputID] = translate('bankAccount.error.ownershipPercentage');
        }
        return errors;
    };

    const handleSubmit = useOnboardingStepFormSubmit({fieldIds: stepFields, onNext, shouldSaveDraft: isEditing});

    return (
        <SingleFieldStep<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM>
            isEditing={isEditing}
            onNext={onNext}
            onMove={onMove}
            formID={ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM}
            formTitle={translate('ownershipInfoStep.whatPercentage')}
            validate={validate}
            onSubmit={handleSubmit}
            inputId={ownershipPercentageInputID}
            inputLabel={translate('ownershipInfoStep.ownership')}
            inputMode={CONST.INPUT_MODE.NUMERIC}
            defaultValue={ownerValues.ownershipPercentage}
            shouldShowHelpLinks={false}
            shouldDelayAutoFocus
        />
    );
}

export default OwnershipPercentage;
