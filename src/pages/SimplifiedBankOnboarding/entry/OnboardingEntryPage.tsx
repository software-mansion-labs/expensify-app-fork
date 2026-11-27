/**
 * The page that opens the bank onboarding of a workspace. It reads the account, decides which screen the user sees (a
 * blocker, a loader, the connected account, the redirect to the pending validation, or the setup options) and stays
 * mounted under the flow pages, where its read and cleanup rules keep working on the shared account object.
 * It mirrors `ReimbursementAccountPage`.
 */
import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';
import ReimbursementAccountLoadingIndicator from '@components/ReimbursementAccountLoadingIndicator';

import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';

import Navigation from '@libs/Navigation/Navigation';
import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';

import ONYXKEYS from '@src/ONYXKEYS';
import type SCREENS from '@src/SCREENS';

import React from 'react';

import {goBackFromEntryStep} from './entryNavigation';
import getEntryState, {getEntryStep} from './getEntryState';
import useEntryAccountRead from './useEntryAccountRead';
import ConnectedBankAccountView from './views/ConnectedBankAccountView';
import EntryBlockedView from './views/EntryBlockedView';
import SetupOptions from './views/options/SetupOptions';
import PendingValidationRedirect from './views/PendingValidationRedirect';

type OnboardingEntryPageProps = PlatformStackScreenProps<BankOnboardingLabParamList, typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.ENTRY>;

function OnboardingEntryPage({route}: OnboardingEntryPageProps) {
    const {isOffline} = useNetwork();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);
    const [workspaces] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES);

    const policyID = route.params?.policyID;
    const bankAccountID = route.params?.bankAccountID ? Number(route.params.bankAccountID) : undefined;
    const backTo = route.params?.backTo;
    const isChangingBankAccount = !!route.params?.isChangingBankAccount;

    const {isReadPending, hasReadFailed, keepAccountOnUnmount, releaseAccountOnUnmount} = useEntryAccountRead({policyID, bankAccountID, isChangingBankAccount});
    const state = getEntryState({
        policyID,
        bankAccountID,
        account,
        workspaces,
        draft,
        isOffline,
        isChangingBankAccount,
        isReadPending,
        hasReadFailed,
    });
    const workspaceName = policyID ? workspaces?.[policyID]?.name : undefined;

    const goBack = () => Navigation.goBack(backTo);
    const goBackFromStep = () => goBackFromEntryStep(getEntryStep(account, draft), account?.achData, backTo);

    switch (state.kind) {
        case 'offline':
        case 'notFound':
        case 'throttled':
        case 'unsupportedCurrency':
            return (
                <EntryBlockedView
                    state={state}
                    workspaceName={workspaceName}
                    backTo={backTo}
                />
            );
        case 'loading':
            if (state.waitsFor === 'workspaces') {
                return (
                    <FullScreenLoadingIndicator
                        shouldUseGoBackButton
                        onGoBack={goBack}
                    />
                );
            }
            return <ReimbursementAccountLoadingIndicator onBackButtonPress={goBackFromStep} />;
        case 'connected':
            return (
                <ConnectedBankAccountView
                    isNonUSD={state.isNonUSD}
                    backTo={backTo}
                    onBackButtonPress={goBackFromStep}
                />
            );
        case 'pendingValidation':
            return (
                <PendingValidationRedirect
                    policyID={policyID}
                    backTo={backTo}
                    keepAccountOnUnmount={keepAccountOnUnmount}
                    releaseAccountOnUnmount={releaseAccountOnUnmount}
                />
            );
        default:
            return (
                <SetupOptions
                    policyID={policyID}
                    backTo={backTo}
                    workspaceName={workspaceName}
                    isNonUSD={state.isNonUSD}
                    currency={state.currency}
                    canContinue={state.canContinue}
                    isChangingBankAccount={isChangingBankAccount}
                />
            );
    }
}

export default OnboardingEntryPage;
