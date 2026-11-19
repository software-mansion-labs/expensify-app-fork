/**
 * The owners list of the NonUSD loop. The other owners come from the draft, like in the real `BeneficialOwnersList`.
 * The details of the current user are not collected in this module, so the user shows as a read only row.
 */
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';

import {getLatestErrorMessage} from '@libs/ErrorUtils';

import OwnersList from '@pages/SimplifiedBankOnboarding/components/owners/OwnersList';
import type {OwnerRow} from '@pages/SimplifiedBankOnboarding/components/owners/OwnersList';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

import getValuesForBeneficialOwner from './utils/getValuesForBeneficialOwner';

type BeneficialOwnersListProps = {
    ownerKeys: string[];
    isUserOwner: boolean;

    /** Sends every owner to the server */
    onConfirm: () => void;

    /** Opens the details form of an owner that the user already added */
    onEdit: (ownerID: string) => void;
};

const CURRENT_USER_ROW_ID = 'currentUser';

function BeneficialOwnersList({ownerKeys, isUserOwner, onConfirm, onEdit}: BeneficialOwnersListProps) {
    const {translate} = useLocalize();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);

    const ownerRows = ownerKeys.map((ownerID): OwnerRow => {
        const values = getValuesForBeneficialOwner(ownerID, draft);
        return {id: ownerID, title: values.fullName, description: `${values.ownershipPercentage}%`, onPress: () => onEdit(ownerID)};
    });

    return (
        <OwnersList
            rows={isUserOwner ? [{id: CURRENT_USER_ROW_ID, title: translate('common.you')}, ...ownerRows] : ownerRows}
            error={getLatestErrorMessage(account)}
            isLoading={!!account?.isSavingCorpayOnboardingBeneficialOwnersFields}
            onConfirm={onConfirm}
        />
    );
}

export default BeneficialOwnersList;
