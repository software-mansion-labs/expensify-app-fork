/**
 * The owners list of the NonUSD loop. It shows the owners that the step resolved, the current user included, like the
 * real `BeneficialOwnersList`.
 */
import OwnersList from '@pages/SimplifiedBankOnboarding/components/owners/OwnersList';
import type {OwnerRow} from '@pages/SimplifiedBankOnboarding/components/owners/OwnersList';
import type {StepRequestProps} from '@pages/SimplifiedBankOnboarding/requests/types';
import {toParams} from '@pages/SimplifiedBankOnboarding/values/codecs/nonUSDBeneficialOwners';
import type {GlobalOwnerValues} from '@pages/SimplifiedBankOnboarding/values/codecs/nonUSDBeneficialOwners';

import React from 'react';

type BeneficialOwnersListProps = {
    /** The owners in the order of the list, with their fields from the draft first and then from the saved owner */
    owners: Array<{ownerID: string; values: GlobalOwnerValues}>;

    /** Sends every owner to the server */
    onConfirm: () => void;

    /** Opens the details form of an owner that the user already added */
    onEdit: (ownerID: string) => void;
} & StepRequestProps;

function BeneficialOwnersList({owners, onConfirm, onEdit, isRequestPending, requestErrorMessage}: BeneficialOwnersListProps) {
    const ownerRows = owners.map(({ownerID, values}): OwnerRow => {
        const owner = toParams(ownerID, values);
        return {id: ownerID, title: owner.fullName, description: `${owner.ownershipPercentage}%`, onPress: () => onEdit(ownerID)};
    });

    return (
        <OwnersList
            rows={ownerRows}
            error={requestErrorMessage}
            isLoading={isRequestPending}
            onConfirm={onConfirm}
        />
    );
}

export default BeneficialOwnersList;
