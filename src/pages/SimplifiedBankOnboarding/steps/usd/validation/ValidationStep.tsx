/**
 * The last step of the USD flow. Like the real step it has no sub pages: the state of the bank account picks what to
 * show, and the server answer that changes the state is what moves the screen on. A connected account gets its own
 * screen, too many wrong deposit amounts block the form, a pending account asks for the test deposits, and an account
 * in review shows the review card.
 */
import useOnyx from '@hooks/useOnyx';

import type {CustomStepProps} from '@pages/SimplifiedBankOnboarding/controller/types';
import {isPendingValidation, isVerifying} from '@pages/SimplifiedBankOnboarding/model/setupStatus';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

import ConnectedBankAccount from './ConnectedBankAccount';
import DepositsForm from './DepositsForm';
import FinishReviewCard from './FinishReviewCard';
import MaxAttemptsReachedMessage from './MaxAttemptsReachedMessage';

type ValidationStepProps = Pick<CustomStepProps, 'policyID' | 'isSubmitting' | 'errorText' | 'onComplete' | 'goToStep'>;

function ValidationStep({policyID, isSubmitting, errorText, onComplete, goToStep}: ValidationStepProps) {
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const achData = account?.achData;

    if (achData?.state === SBO_CONST.STATE.OPEN) {
        return <ConnectedBankAccount onComplete={onComplete} />;
    }
    if (account?.maxAttemptsReached) {
        return <MaxAttemptsReachedMessage />;
    }
    if (isPendingValidation(achData)) {
        return (
            <DepositsForm
                policyID={policyID}
                achData={achData}
                isSubmitting={isSubmitting}
                errorText={errorText}
            />
        );
    }
    if (isVerifying(achData)) {
        return (
            <FinishReviewCard
                policyID={policyID}
                goToStep={goToStep}
            />
        );
    }
    return null;
}

export default ValidationStep;
