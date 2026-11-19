/**
 * The owners list of the USD loop. The row of the current user shows the requestor data that the server saved in the
 * personal info step, and the other rows show the owners that the step resolved, like the real `CompanyOwnersListUBO`.
 */
import OwnersList from '@pages/SimplifiedBankOnboarding/components/owners/OwnersList';
import type {OwnerRow} from '@pages/SimplifiedBankOnboarding/components/owners/OwnersList';
import type {StepRequestProps} from '@pages/SimplifiedBankOnboarding/requests/types';
import type {UBOValues} from '@pages/SimplifiedBankOnboarding/values/codecs/usdBeneficialOwners';

import React from 'react';

type CompanyOwnersListUBOProps = {
    /** The name and date of birth that the user saved in the personal info step */
    requestor: UBOValues;

    /** The other owners in the order of the list */
    owners: Array<{ownerID: string; values: UBOValues}>;
    isUserUBO: boolean;

    /** Sends every owner to the server */
    onConfirm: () => void;

    /** Opens the details form of an owner that the user already added */
    onEdit: (beneficialOwnerID: string) => void;
} & StepRequestProps;

const REQUESTOR_ROW_ID = 'requestor';

function CompanyOwnersListUBO({requestor, owners, isUserUBO, onConfirm, onEdit, isRequestPending, requestErrorMessage}: CompanyOwnersListUBOProps) {
    const requestorRows: OwnerRow[] = isUserUBO ? [{id: REQUESTOR_ROW_ID, title: `${requestor.firstName} ${requestor.lastName}`, description: requestor.dob}] : [];
    const otherOwnerRows = owners.map(
        ({ownerID, values}): OwnerRow => ({
            id: ownerID,
            title: `${values.firstName} ${values.lastName}`,
            description: values.dob,
            onPress: () => onEdit(ownerID),
        }),
    );

    return (
        <OwnersList
            rows={[...requestorRows, ...otherOwnerRows]}
            error={requestErrorMessage}
            isLoading={isRequestPending}
            onConfirm={onConfirm}
        />
    );
}

export default CompanyOwnersListUBO;
