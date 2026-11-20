/**
 * The first sub page of the NonUSD bank step: the inputs that describe the bank account itself.
 */

import useLocalize from '@hooks/useLocalize';

import ServerDrivenFieldsForm from '@pages/SimplifiedBankOnboarding/nonUSD/BankInfo/ServerDrivenFieldsForm';
import type BankInfoSubStepProps from '@pages/SimplifiedBankOnboarding/nonUSD/BankInfo/types';
import {getBankAccountDetailsFields} from '@pages/SimplifiedBankOnboarding/utils/BankFieldUtils';

import React from 'react';

function BankAccountDetails({onNext, isEditing, bankFields, values}: BankInfoSubStepProps) {
    const {translate} = useLocalize();

    return (
        <ServerDrivenFieldsForm
            title={translate('bankInfoStep.whatAreYour')}
            fields={getBankAccountDetailsFields(bankFields)}
            isLoading={!!bankFields?.isLoading}
            defaultValues={values}
            isEditing={isEditing}
            onNext={onNext}
        />
    );
}

export default BankAccountDetails;
