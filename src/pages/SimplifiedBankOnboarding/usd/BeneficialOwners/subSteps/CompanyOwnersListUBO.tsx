/**
 * The owners list of the USD loop. The row of the current user shows the requestor data that the server saved in the
 * personal info step, and the other rows come from the draft, like the real `CompanyOwnersListUBO`.
 */
import useOnyx from '@hooks/useOnyx';

import OwnersList from '@pages/SimplifiedBankOnboarding/components/owners/OwnersList';
import type {OwnerRow} from '@pages/SimplifiedBankOnboarding/components/owners/OwnersList';
import type {StepRequestProps} from '@pages/SimplifiedBankOnboarding/requests/types';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import getValuesForBeneficialOwner from '@pages/SimplifiedBankOnboarding/usd/BeneficialOwners/utils/getValuesForBeneficialOwner';
import getSubStepValues from '@pages/SimplifiedBankOnboarding/utils/getSubStepValues';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

type CompanyOwnersListUBOProps = {
    beneficialOwnerKeys: string[];
    isUserUBO: boolean;
    isAnyoneElseUBO: boolean;

    /** Sends every owner to the server */
    onConfirm: () => void;

    /** Opens the details form of an owner that the user already added */
    onEdit: (beneficialOwnerID: string) => void;
} & StepRequestProps;

const REQUESTOR_KEYS = {
    FIRST_NAME: INPUT_IDS.FIRST_NAME,
    LAST_NAME: INPUT_IDS.LAST_NAME,
    DOB: INPUT_IDS.DOB,
};

const REQUESTOR_ROW_ID = 'requestor';

function CompanyOwnersListUBO({beneficialOwnerKeys, isUserUBO, isAnyoneElseUBO, onConfirm, onEdit, isRequestPending, requestErrorMessage}: CompanyOwnersListUBOProps) {
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);

    // The real list reads the requestor from the server data only, so the draft is skipped on purpose.
    const requestorData = getSubStepValues(REQUESTOR_KEYS, undefined, account);

    const requestorRows: OwnerRow[] = isUserUBO ? [{id: REQUESTOR_ROW_ID, title: `${requestorData.firstName} ${requestorData.lastName}`, description: requestorData.dob}] : [];
    const otherOwnerKeys = isAnyoneElseUBO ? beneficialOwnerKeys : [];
    const otherOwnerRows = otherOwnerKeys.map((beneficialOwnerID): OwnerRow => {
        const values = getValuesForBeneficialOwner(beneficialOwnerID, draft);
        return {
            id: beneficialOwnerID,
            title: `${values.firstName} ${values.lastName}`,
            description: values.dob,
            onPress: () => onEdit(beneficialOwnerID),
        };
    });

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
