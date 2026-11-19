/**
 * The confirmation sub page of a signer. It reads the values from the draft only, like the real one, and shows the
 * progress of the director request from the key that its form watches: the account for the signer step, the signer form
 * for the page of an invited director.
 */
import ConfirmationStep from '@components/SubStepForms/ConfirmationStep';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';

import {getLatestErrorMessage} from '@libs/ErrorUtils';

import type {SignerDetailsSubPageProps} from '@pages/SimplifiedBankOnboarding/nonUSD/SignerInfo/types';
import useSignerDraftValue from '@pages/SimplifiedBankOnboarding/nonUSD/SignerInfo/useSignerDraftValue';
import {SIGNER_INPUT_IDS} from '@pages/SimplifiedBankOnboarding/types/form';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

// The positions of the input sub pages in the lists of both signer forms
const DETAILS_SUBSTEP_INDEX = {
    NAME: 0,
    JOB_TITLE: 1,
};

function Confirmation({onNext, onMove, isEditing, formID}: SignerDetailsSubPageProps) {
    const {translate} = useLocalize();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [signerForm] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM);
    const fullName = useSignerDraftValue(formID, SIGNER_INPUT_IDS.SIGNER_FULL_NAME);
    const jobTitle = useSignerDraftValue(formID, SIGNER_INPUT_IDS.SIGNER_JOB_TITLE);

    const isOnboardingForm = formID === ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM;
    const isLoading = isOnboardingForm ? !!account?.isSavingCorpayOnboardingDirectorInformation : !!signerForm?.isSavingSignerInformation;
    const error = isOnboardingForm ? getLatestErrorMessage(account) : getLatestErrorMessage(signerForm);

    const summaryItems = [
        {
            id: 'legal-name',
            title: fullName,
            description: translate('signerInfoStep.legalName'),
            shouldShowRightIcon: true,
            onPress: () => onMove(DETAILS_SUBSTEP_INDEX.NAME),
        },
        {
            id: 'job-title',
            title: jobTitle,
            description: translate('signerInfoStep.jobTitle'),
            shouldShowRightIcon: true,
            onPress: () => onMove(DETAILS_SUBSTEP_INDEX.JOB_TITLE),
        },
    ];

    return (
        <ConfirmationStep
            isEditing={isEditing}
            onNext={onNext}
            onMove={onMove}
            pageTitle={translate('signerInfoStep.letsDoubleCheck')}
            summaryItems={summaryItems}
            showOnfidoLinks={false}
            isLoading={isLoading}
            error={error}
        />
    );
}

export default Confirmation;
