/**
 * The confirmation sub page of the business info step. Each row sends the user back to a sub page by its position, and
 * the button shows the state of the only request of the step, which this page sends.
 */
import ConfirmationStep from '@components/SubStepForms/ConfirmationStep';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';

import type StepRequestSubPageProps from '@pages/SimplifiedBankOnboarding/requests/types';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import BUSINESS_INFO_KEYS from '@pages/SimplifiedBankOnboarding/usd/BusinessInfo/BUSINESS_INFO_KEYS';
import getSubStepValues from '@pages/SimplifiedBankOnboarding/utils/getSubStepValues';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

const SUBSTEP_INDEX = SBO_CONST.USD.SUBSTEP_INDEX.BUSINESS_INFO;

function Confirmation({onNext, onMove, isEditing, isRequestPending, requestErrorMessage}: StepRequestSubPageProps) {
    const {translate} = useLocalize();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);

    const values = getSubStepValues(BUSINESS_INFO_KEYS, draft, account);

    const summaryItems = [
        {
            id: 'companyName',
            description: translate('businessInfoStep.businessName'),
            title: values.companyName,
            shouldShowRightIcon: true,
            onPress: () => onMove(SUBSTEP_INDEX.NAME),
        },
        {
            id: 'companyTaxID',
            description: translate('businessInfoStep.taxIDNumber'),
            title: values.companyTaxID,
            shouldShowRightIcon: true,
            onPress: () => onMove(SUBSTEP_INDEX.TAX_ID),
        },
        {
            id: 'incorporationType',
            description: translate('businessInfoStep.companyType'),
            title: values.incorporationType,
            shouldShowRightIcon: true,
            onPress: () => onMove(SUBSTEP_INDEX.INCORPORATION_TYPE),
        },
    ];

    return (
        <ConfirmationStep
            isEditing={isEditing}
            onNext={onNext}
            onMove={onMove}
            pageTitle={translate('businessInfoStep.letsDoubleCheck')}
            summaryItems={summaryItems}
            showOnfidoLinks={false}
            isLoading={isRequestPending}
            error={requestErrorMessage}
        />
    );
}

export default Confirmation;
