/**
 * The confirmation sub page of a signer. It shows the values that the page around it resolved and the state of the
 * director request that this page sent. A form that skipped the name page shows no name row.
 */
import ConfirmationStep from '@components/SubStepForms/ConfirmationStep';

import useLocalize from '@hooks/useLocalize';

import type {SignerDetailsSubPageProps} from '@pages/SimplifiedBankOnboarding/nonUSD/SignerInfo/types';

import React from 'react';

// The positions of the input sub pages in the lists of both signer forms
const DETAILS_SUBSTEP_INDEX = {
    NAME: 0,
    JOB_TITLE: 1,
};

function Confirmation({onNext, onMove, isEditing, values, isNamePageSkipped, isRequestPending, requestErrorMessage}: SignerDetailsSubPageProps) {
    const {translate} = useLocalize();

    const nameItem = {
        id: 'legal-name',
        title: values.signerFullName,
        description: translate('signerInfoStep.legalName'),
        shouldShowRightIcon: true,
        onPress: () => onMove(DETAILS_SUBSTEP_INDEX.NAME),
    };
    const jobTitleItem = {
        id: 'job-title',
        title: values.signerJobTitle,
        description: translate('signerInfoStep.jobTitle'),
        shouldShowRightIcon: true,
        onPress: () => onMove(DETAILS_SUBSTEP_INDEX.JOB_TITLE),
    };
    const summaryItems = isNamePageSkipped ? [jobTitleItem] : [nameItem, jobTitleItem];

    return (
        <ConfirmationStep
            isEditing={isEditing}
            onNext={onNext}
            onMove={onMove}
            pageTitle={translate('signerInfoStep.letsDoubleCheck')}
            summaryItems={summaryItems}
            showOnfidoLinks={false}
            isLoading={isRequestPending}
            error={requestErrorMessage}
        />
    );
}

export default Confirmation;
