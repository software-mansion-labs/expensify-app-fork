/**
 * The owners list of the NonUSD loop. Every owner comes from the draft, the current user included, like in the real
 * `BeneficialOwnersList`.
 */
import useOnyx from '@hooks/useOnyx';

import {getLatestErrorMessage} from '@libs/ErrorUtils';

import OwnersList from '@pages/SimplifiedBankOnboarding/components/owners/OwnersList';
import type {OwnerRow} from '@pages/SimplifiedBankOnboarding/components/owners/OwnersList';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

import getValuesForBeneficialOwner from './utils/getValuesForBeneficialOwner';

type BeneficialOwnersListProps = {
    ownerKeys: string[];

    /** Sends every owner to the server */
    onConfirm: () => void;

    /** Opens the details form of an owner that the user already added */
    onEdit: (ownerID: string) => void;
};

function BeneficialOwnersList({ownerKeys, onConfirm, onEdit}: BeneficialOwnersListProps) {
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);

    const ownerRows = ownerKeys.map((ownerID): OwnerRow => {
        const values = getValuesForBeneficialOwner(ownerID, draft);
        return {id: ownerID, title: values.fullName, description: `${values.ownershipPercentage}%`, onPress: () => onEdit(ownerID)};
    });

    return (
        <OwnersList
            rows={ownerRows}
            error={getLatestErrorMessage(account)}
            isLoading={!!account?.isSavingCorpayOnboardingBeneficialOwnersFields}
            onConfirm={onConfirm}
        />
    );
}

export default BeneficialOwnersList;
