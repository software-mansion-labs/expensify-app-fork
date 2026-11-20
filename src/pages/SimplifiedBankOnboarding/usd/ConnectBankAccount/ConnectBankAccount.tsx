/**
 * The last step of the USD flow. Like the real step it has no sub pages and no request of its own: an if-chain over the
 * bank account state picks what to show, and the server answer that changes the state is what moves the screen on. A
 * connected account gets its own screen, too many wrong deposit amounts block the form, a pending account asks for the test
 * deposits, and an account in review shows the review card.
 */
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';

import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type USDPageProps from '@pages/SimplifiedBankOnboarding/usd/types';

import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';

import BankAccountValidationForm from './BankAccountValidationForm';
import ConnectedBankAccount from './ConnectedBankAccount';
import FinishReviewCard from './FinishReviewCard';
import MaxAttemptsReachedMessage from './MaxAttemptsReachedMessage';

type ConnectBankAccountProps = Pick<USDPageProps, 'onSubmit' | 'onBackButtonPress' | 'policyID' | 'stepNames' | 'startStepIndex' | 'backTo'>;

function ConnectBankAccount({onSubmit, onBackButtonPress, policyID, stepNames, startStepIndex, backTo}: ConnectBankAccountProps) {
    const {translate} = useLocalize();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);

    const bankAccountState = account?.achData?.state ?? '';
    const maxAttemptsReached = account?.maxAttemptsReached ?? false;
    const isBankAccountOpen = bankAccountState === SBO_CONST.STATE.OPEN;
    const isBankAccountPending = bankAccountState === SBO_CONST.STATE.PENDING;
    const isBankAccountVerifying = bankAccountState === SBO_CONST.STATE.VERIFYING;

    const renderContent = () => {
        if (isBankAccountOpen) {
            return <ConnectedBankAccount onSubmit={onSubmit} />;
        }
        if (maxAttemptsReached) {
            return <MaxAttemptsReachedMessage />;
        }
        if (isBankAccountPending) {
            return <BankAccountValidationForm />;
        }
        if (isBankAccountVerifying) {
            return (
                <FinishReviewCard
                    policyID={policyID}
                    backTo={backTo}
                />
            );
        }
        return null;
    };

    return (
        <InteractiveStepWrapper
            wrapperID="SimplifiedBankOnboardingConnectBankAccount"
            shouldEnablePickerAvoiding={false}
            shouldEnableMaxHeight
            headerTitle={isBankAccountPending ? translate('connectBankAccountStep.validateYourBankAccount') : translate('bankAccount.addBankAccount')}
            handleBackButtonPress={onBackButtonPress}
            startStepIndex={startStepIndex}
            stepNames={stepNames}
        >
            {renderContent()}
        </InteractiveStepWrapper>
    );
}

export default ConnectBankAccount;
