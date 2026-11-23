/**
 * The last step of the USD flow. Like the real step it has no sub pages: the state of the bank account picks what to
 * show, and the server answer that changes the state is what moves the screen on. A connected account gets its own
 * screen, too many wrong deposit amounts block the form, a pending account asks for the test deposits, and an account
 * in review shows the review card.
 */
import useOnyx from '@hooks/useOnyx';

import type {ACHData, OnboardingAccount} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {isPendingValidation, isVerifying} from '@pages/SimplifiedBankOnboarding/contract/setupStatus';
import type {CustomStepProps} from '@pages/SimplifiedBankOnboarding/flows/shared/plan/types';

import ONYXKEYS from '@src/ONYXKEYS';

import type {OnyxEntry} from 'react-native-onyx';

import React from 'react';

import ConnectedBankAccount from './ConnectedBankAccount';
import DepositsForm from './DepositsForm';
import FinishReviewCard from './FinishReviewCard';
import MaxAttemptsReachedMessage from './MaxAttemptsReachedMessage';

type ValidationStepProps = Pick<CustomStepProps, 'policyID' | 'isSubmitting' | 'errorText' | 'onComplete' | 'goToStep'>;

type ValidationState = {
    /** The state picks the screen and the bank account ID goes with the deposit amounts */
    achData: Pick<ACHData, 'state' | 'bankAccountID'>;
    hasReachedMaxAttempts: boolean;
};

const validationStateSelector = (account: OnyxEntry<OnboardingAccount>): ValidationState => ({
    achData: {state: account?.achData?.state, bankAccountID: account?.achData?.bankAccountID},
    hasReachedMaxAttempts: !!account?.maxAttemptsReached,
});

function ValidationStep({policyID, isSubmitting, errorText, onComplete, goToStep}: ValidationStepProps) {
    const [validationState] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {selector: validationStateSelector});
    const achData = validationState?.achData;

    if (achData?.state === SBO_CONST.STATE.OPEN) {
        return <ConnectedBankAccount onComplete={onComplete} />;
    }
    if (validationState?.hasReachedMaxAttempts) {
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
