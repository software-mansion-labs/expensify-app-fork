/**
 * The last step of the USD flow. It has no request of its own and does not wait for one: the bank account state picks
 * what it shows, and the server answer that changes the state moves the screen on. A connected account gets its own
 * screen, too many wrong deposit amounts block the form, a pending account asks for the test deposits, and an account in
 * review shows the review card. Back from a pending account leaves the whole flow, because the entry would open this
 * step again.
 */
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';

import type {OnboardingAccount} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {isPendingValidation, isVerifying} from '@pages/SimplifiedBankOnboarding/contract/setupStatus';
import {OnboardingStep, useOnboardingFlow} from '@pages/SimplifiedBankOnboarding/core';

import ONYXKEYS from '@src/ONYXKEYS';

import type {OnyxEntry} from 'react-native-onyx';

import React from 'react';

import ConnectedBankAccount from './ConnectedBankAccount';
import DepositsForm from './DepositsForm';
import FinishReviewCard from './FinishReviewCard';
import MaxAttemptsReachedMessage from './MaxAttemptsReachedMessage';

type ValidationContent = 'connected' | 'maxAttemptsReached' | 'deposits' | 'review' | 'none';

/** The checks run in this order, so a connected account wins over the attempt count, and the count over the state */
function getValidationContent(account: OnyxEntry<OnboardingAccount>): ValidationContent {
    if (account?.achData?.state === SBO_CONST.STATE.OPEN) {
        return 'connected';
    }
    if (account?.maxAttemptsReached) {
        return 'maxAttemptsReached';
    }
    if (isPendingValidation(account?.achData)) {
        return 'deposits';
    }
    if (isVerifying(account?.achData)) {
        return 'review';
    }
    return 'none';
}

function ValidationContentView({content}: {content: ValidationContent}) {
    switch (content) {
        case 'connected':
            return <ConnectedBankAccount />;
        case 'maxAttemptsReached':
            return <MaxAttemptsReachedMessage />;
        case 'deposits':
            return <DepositsForm />;
        case 'review':
            return <FinishReviewCard />;
        default:
            return null;
    }
}

function ValidationStep() {
    const {translate} = useLocalize();
    const {leaveFlow} = useOnboardingFlow();
    const [content = 'none'] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {selector: getValidationContent});
    const [isBankAccountPending = false] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {selector: (account) => isPendingValidation(account?.achData)});

    return (
        <OnboardingStep
            title={isBankAccountPending ? translate('connectBankAccountStep.validateYourBankAccount') : translate('bankAccount.addBankAccount')}
            wrapperID="SimplifiedBankOnboardingConnectBankAccount"
            onBackFromStart={isBankAccountPending ? leaveFlow : undefined}
            shouldEnablePickerAvoiding={false}
            shouldEnableMaxHeight
        >
            <ValidationContentView content={content} />
        </OnboardingStep>
    );
}

export default ValidationStep;
