/**
 * The confirmation sub page of the personal info step. Each row sends the user back to a sub page by its position in the
 * list of pages, and the button shows the loading flag that every USD request shares.
 */
import ConfirmationStep from '@components/SubStepForms/ConfirmationStep';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import type {SubPageProps} from '@hooks/useSubPage/types';

import {getLatestErrorMessage} from '@libs/ErrorUtils';

import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import PERSONAL_INFO_KEYS from '@pages/SimplifiedBankOnboarding/usd/PersonalInfo/PERSONAL_INFO_KEYS';
import getSubStepValues from '@pages/SimplifiedBankOnboarding/utils/getSubStepValues';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

const {PERSONAL_INFO: SUBSTEP_INDEX} = SBO_CONST.USD.SUBSTEP_INDEX;

function Confirmation({onNext, onMove, isEditing}: SubPageProps) {
    const {translate} = useLocalize();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);

    const values = getSubStepValues(PERSONAL_INFO_KEYS, draft, account);

    const summaryItems = [
        {
            id: 'legalName',
            description: translate('personalInfoStep.legalName'),
            title: `${values.firstName} ${values.lastName}`,
            shouldShowRightIcon: true,
            onPress: () => onMove(SUBSTEP_INDEX.LEGAL_NAME),
        },
        {
            id: 'dob',
            description: translate('common.dob'),
            title: values.dob,
            shouldShowRightIcon: true,
            onPress: () => onMove(SUBSTEP_INDEX.DATE_OF_BIRTH),
        },
        {
            id: 'ssnLast4',
            description: translate('personalInfoStep.last4SSN'),
            title: values.ssnLast4,
            shouldShowRightIcon: true,
            onPress: () => onMove(SUBSTEP_INDEX.SSN),
        },
    ];

    return (
        <ConfirmationStep
            isEditing={isEditing}
            onNext={onNext}
            onMove={onMove}
            pageTitle={translate('personalInfoStep.letsDoubleCheck')}
            summaryItems={summaryItems}
            showOnfidoLinks={false}
            isLoading={!!account?.isLoading}
            error={getLatestErrorMessage(account)}
        />
    );
}

export default Confirmation;
