/**
 * The confirmation sub page of the NonUSD bank step. It lists every input that the server described, and each row goes
 * back to the sub page that owns the input.
 */
import ActivityIndicator from '@components/ActivityIndicator';
import ConfirmationStep from '@components/SubStepForms/ConfirmationStep';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import type BankInfoSubStepProps from '@pages/SimplifiedBankOnboarding/nonUSD/BankInfo/types';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {BankFormField} from '@pages/SimplifiedBankOnboarding/types/onyx';
import {isAccountHolderField} from '@pages/SimplifiedBankOnboarding/utils/BankFieldUtils';

import CONST from '@src/CONST';

import React from 'react';

const {BANK_INFO: SUBSTEP_INDEX} = SBO_CONST.NON_USD.SUBSTEP_INDEX;

/** Shows the label of a picklist value instead of its ID */
function getDisplayValue(field: BankFormField, value: string): string {
    return field.valueSet?.find((option) => option.id === value)?.text ?? value;
}

function Confirmation({onNext, onMove, isEditing, bankFields, values, isRequestPending, requestErrorMessage}: BankInfoSubStepProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();

    const summaryItems = (bankFields?.formFields ?? []).map((field) => ({
        id: field.id,
        description: field.label,
        title: getDisplayValue(field, values[field.id]),
        shouldShowRightIcon: true,
        onPress: () => onMove(isAccountHolderField(field) ? SUBSTEP_INDEX.ACCOUNT_HOLDER_DETAILS : SUBSTEP_INDEX.BANK_ACCOUNT_DETAILS),
    }));

    if (bankFields?.isLoading) {
        return (
            <ActivityIndicator
                size={CONST.ACTIVITY_INDICATOR_SIZE.LARGE}
                style={styles.flexGrow1}
            />
        );
    }

    return (
        <ConfirmationStep
            isEditing={isEditing}
            onNext={onNext}
            onMove={onMove}
            pageTitle={translate('bankInfoStep.letsDoubleCheck')}
            summaryItems={summaryItems}
            showOnfidoLinks={false}
            isLoading={isRequestPending}
            error={requestErrorMessage}
        />
    );
}

export default Confirmation;
