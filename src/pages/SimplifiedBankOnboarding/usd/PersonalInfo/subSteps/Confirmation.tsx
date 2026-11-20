/**
 * The confirmation sub page of the personal info step. Each row sends the user back to a sub page by its position in the
 * list of pages, and the button shows the state of the confirmed request of the step.
 */
import ConfirmationStep from '@components/SubStepForms/ConfirmationStep';

import useLocalize from '@hooks/useLocalize';

import type StepRequestSubPageProps from '@pages/SimplifiedBankOnboarding/requests/types';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {PersonalInfoValues} from '@pages/SimplifiedBankOnboarding/values/codecs/usdPersonalInfo';
import type ResolvedValuesProps from '@pages/SimplifiedBankOnboarding/values/types';

import React from 'react';

const {PERSONAL_INFO: SUBSTEP_INDEX} = SBO_CONST.USD.SUBSTEP_INDEX;

function Confirmation({onNext, onMove, isEditing, isRequestPending, requestErrorMessage, values}: StepRequestSubPageProps & ResolvedValuesProps<PersonalInfoValues>) {
    const {translate} = useLocalize();

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
            isLoading={isRequestPending}
            error={requestErrorMessage}
        />
    );
}

export default Confirmation;
