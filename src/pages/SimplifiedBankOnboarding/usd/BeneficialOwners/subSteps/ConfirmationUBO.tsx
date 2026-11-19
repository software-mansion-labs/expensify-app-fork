/**
 * The confirmation sub page of one owner. It sends nothing: the owner only joins the list in the draft, and the list
 * page sends every owner in one request at the end, like the real `ConfirmationUBO`.
 */
import ConfirmationStep from '@components/SubStepForms/ConfirmationStep';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';

import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type BeneficialOwnerSubPageProps from '@pages/SimplifiedBankOnboarding/usd/BeneficialOwners/types';
import getValuesForBeneficialOwner from '@pages/SimplifiedBankOnboarding/usd/BeneficialOwners/utils/getValuesForBeneficialOwner';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

const {UBO: SUBSTEP_INDEX} = SBO_CONST.USD.SUBSTEP_INDEX;

function ConfirmationUBO({onNext, onMove, isEditing, beneficialOwnerBeingModifiedID}: BeneficialOwnerSubPageProps) {
    const {translate} = useLocalize();
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);

    const values = getValuesForBeneficialOwner(beneficialOwnerBeingModifiedID, draft);

    // The details form starts at the legal name page, so its page positions are the step positions minus that one.
    const moveToSubStep = (subStepIndex: number) => onMove(subStepIndex - SUBSTEP_INDEX.LEGAL_NAME);

    const summaryItems = [
        {
            id: 'legalName',
            description: translate('beneficialOwnerInfoStep.legalName'),
            title: `${values.firstName} ${values.lastName}`,
            shouldShowRightIcon: true,
            onPress: () => moveToSubStep(SUBSTEP_INDEX.LEGAL_NAME),
        },
        {
            id: 'dob',
            description: translate('common.dob'),
            title: values.dob,
            shouldShowRightIcon: true,
            onPress: () => moveToSubStep(SUBSTEP_INDEX.DATE_OF_BIRTH),
        },
    ];

    return (
        <ConfirmationStep
            isEditing={isEditing}
            onNext={onNext}
            onMove={onMove}
            pageTitle={translate('beneficialOwnerInfoStep.letsDoubleCheck')}
            summaryItems={summaryItems}
            showOnfidoLinks={false}
        />
    );
}

export default ConfirmationUBO;
