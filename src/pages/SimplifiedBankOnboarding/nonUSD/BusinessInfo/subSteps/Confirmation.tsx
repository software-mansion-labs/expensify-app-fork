/**
 * The confirmation sub page of the business step. It shows the label of the picked business type, and the button shows the
 * state of the company request.
 */
import ConfirmationStep from '@components/SubStepForms/ConfirmationStep';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';

import BUSINESS_INFO_KEYS from '@pages/SimplifiedBankOnboarding/nonUSD/BusinessInfo/BUSINESS_INFO_KEYS';
import type StepRequestSubPageProps from '@pages/SimplifiedBankOnboarding/requests/types';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import getSubStepValues from '@pages/SimplifiedBankOnboarding/utils/getSubStepValues';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

const {BUSINESS_INFO: SUBSTEP_INDEX} = SBO_CONST.NON_USD.SUBSTEP_INDEX;

function Confirmation({onNext, onMove, isEditing, isRequestPending, requestErrorMessage}: StepRequestSubPageProps) {
    const {translate} = useLocalize();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);
    const [onboardingPicklists] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PICKLISTS);

    const values = getSubStepValues(BUSINESS_INFO_KEYS, draft, account);
    const businessTypeName = onboardingPicklists?.picklists?.businessType?.find((option) => option.id === values.businessType)?.name ?? values.businessType;

    const summaryItems = [
        {
            id: 'companyName',
            description: translate('businessInfoStep.legalBusinessName'),
            title: values.companyName,
            shouldShowRightIcon: true,
            onPress: () => onMove(SUBSTEP_INDEX.NAME),
        },
        {
            id: 'businessType',
            description: translate('businessInfoStep.businessType'),
            title: businessTypeName,
            shouldShowRightIcon: true,
            onPress: () => onMove(SUBSTEP_INDEX.BUSINESS_TYPE),
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
