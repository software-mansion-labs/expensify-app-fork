/**
 * The second sub page of the NonUSD bank step: the inputs about the holder of the bank account.
 */

import useLocalize from '@hooks/useLocalize';

import ServerDrivenFieldsForm from '@pages/SimplifiedBankOnboarding/nonUSD/BankInfo/ServerDrivenFieldsForm';
import type BankInfoSubStepProps from '@pages/SimplifiedBankOnboarding/nonUSD/BankInfo/types';
import {getAccountHolderDetailsFields} from '@pages/SimplifiedBankOnboarding/utils/BankFieldUtils';

import React from 'react';

function AccountHolderDetails({onNext, isEditing, bankFields}: BankInfoSubStepProps) {
    const {translate} = useLocalize();

    return (
        <ServerDrivenFieldsForm
            title={translate('addPersonalBankAccount.accountHolderInformationStepHeader')}
            fields={getAccountHolderDetailsFields(bankFields)}
            isLoading={!!bankFields?.isLoading}
            isEditing={isEditing}
            onNext={onNext}
        />
    );
}

export default AccountHolderDetails;
