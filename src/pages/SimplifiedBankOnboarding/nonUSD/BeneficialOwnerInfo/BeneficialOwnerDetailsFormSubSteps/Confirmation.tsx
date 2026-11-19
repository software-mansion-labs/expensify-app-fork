/**
 * The confirmation sub page of one owner. It sends nothing: the owner only joins the list in the draft, and the list
 * page sends every owner in one request, like the real `Confirmation` of the NonUSD owner form.
 */
import ConfirmationStep from '@components/SubStepForms/ConfirmationStep';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';

import type BeneficialOwnerSubPageProps from '@pages/SimplifiedBankOnboarding/nonUSD/BeneficialOwnerInfo/types';
import getValuesForBeneficialOwner from '@pages/SimplifiedBankOnboarding/nonUSD/BeneficialOwnerInfo/utils/getValuesForBeneficialOwner';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

const {BENEFICIAL_OWNER_INFO: SUBSTEP_INDEX} = SBO_CONST.NON_USD.SUBSTEP_INDEX;

function Confirmation({onNext, onMove, isEditing, ownerBeingModifiedID}: BeneficialOwnerSubPageProps) {
    const {translate} = useLocalize();
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);

    const values = getValuesForBeneficialOwner(ownerBeingModifiedID, draft);

    // The details form starts at the name page, so its page positions are the step positions minus that one.
    const moveToSubStep = (subStepIndex: number) => onMove(subStepIndex - SUBSTEP_INDEX.NAME);

    const summaryItems = [
        {
            id: 'fullName',
            description: translate('ownershipInfoStep.legalName'),
            title: values.fullName,
            shouldShowRightIcon: true,
            onPress: () => moveToSubStep(SUBSTEP_INDEX.NAME),
        },
        {
            id: 'ownershipPercentage',
            description: translate('ownershipInfoStep.ownershipPercentage'),
            title: `${values.ownershipPercentage}%`,
            shouldShowRightIcon: true,
            onPress: () => moveToSubStep(SUBSTEP_INDEX.OWNERSHIP_PERCENTAGE),
        },
    ];

    return (
        <ConfirmationStep
            isEditing={isEditing}
            onNext={onNext}
            onMove={onMove}
            pageTitle={translate('ownershipInfoStep.letsDoubleCheck')}
            summaryItems={summaryItems}
            showOnfidoLinks={false}
        />
    );
}

export default Confirmation;
