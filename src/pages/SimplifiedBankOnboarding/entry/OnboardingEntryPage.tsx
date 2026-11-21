/**
 * The page that opens the bank onboarding of a workspace. It reads the account of the URL each time it is focused,
 * decides what to show in the pure `getEntryState` chain and renders one view per state. It mirrors
 * `ReimbursementAccountPage`, without its mirrored state and its navigation refs.
 */
import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';

import useNetwork from '@hooks/useNetwork';

import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';

import type {AccountReadParams} from '@pages/SimplifiedBankOnboarding/flows';
import {clearDraft, useAccountRead, useFlowData} from '@pages/SimplifiedBankOnboarding/flows';

import CONST from '@src/CONST';
import type SCREENS from '@src/SCREENS';

import {useIsFocused} from '@react-navigation/native';
import React, {useEffect, useEffectEvent} from 'react';

import {leaveEntry} from './entryNavigation';
import getAccountRef, {isAccountOfRef} from './getAccountRef';
import getEntryState from './getEntryState';
import clearAccountErrors from './requests/clearAccountErrors';
import ConnectedBankAccountView from './views/ConnectedBankAccountView';
import EntryErrorView from './views/EntryErrorView';
import EntryNotFoundView from './views/EntryNotFoundView';
import EntryOfflineView from './views/EntryOfflineView';
import NewSetupOptions from './views/options/NewSetupOptions';
import ResumeSetupOptions from './views/options/ResumeSetupOptions';
import PendingValidationView from './views/PendingValidationView';

type OnboardingEntryPageProps = PlatformStackScreenProps<BankOnboardingLabParamList, typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.ENTRY>;

function OnboardingEntryPage({route}: OnboardingEntryPageProps) {
    const isFocused = useIsFocused();
    const dataSource = useFlowData();
    const {account, workspaces, draft} = dataSource.data;

    const policyIDParam = route.params?.policyID;
    const bankAccountIDParam = route.params?.bankAccountID;
    const backTo = route.params?.backTo;
    const isChangingBankAccount = !!route.params?.isChangingBankAccount;
    const ref = getAccountRef(policyIDParam, bankAccountIDParam, workspaces, account?.achData);

    // The instance that changes the bank account shares the data of the instance under it, so it never reads
    const getReadParams = (): AccountReadParams | undefined => {
        if (isChangingBankAccount || (!policyIDParam && !bankAccountIDParam)) {
            return undefined;
        }
        return bankAccountIDParam ? {bankAccountID: Number(bankAccountIDParam)} : {policyID: policyIDParam};
    };

    // A start over waits for its own answer, so the reconnect only reads when no reset is on its way
    const {readAccount, hasReadFailed} = useAccountRead(getReadParams(), {shouldReadOnReconnect: account?.pendingAction !== CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE});

    const readOnFocus = useEffectEvent(() => {
        // The draft of another account must not prefill this one
        if (!isChangingBankAccount && !isAccountOfRef(account?.achData, ref)) {
            clearDraft();
        }
        readAccount();
    });

    const {isOffline} = useNetwork();

    // Every focus reads again, because the server may have moved on, and a change of the bank account that the user
    // abandoned leaves the shared key without the connected account that this page shows
    useEffect(() => {
        if (!isFocused) {
            return;
        }
        readOnFocus();
    }, [isFocused, policyIDParam, bankAccountIDParam]);

    // The Payments page shows the account error too, so an error of this visit must not follow the user out of the lab
    useEffect(() => clearAccountErrors, []);

    const state = getEntryState({ref, account, workspaces, draft, isOffline, isChangingBankAccount, hasReadFailed});
    const workspaceName = ref.policyID ? workspaces?.[ref.policyID]?.name : undefined;

    switch (state.kind) {
        case 'offline':
            return <EntryOfflineView backTo={backTo} />;
        case 'loading':
            return <FullScreenLoadingIndicator onGoBack={() => leaveEntry(backTo)} />;
        case 'notFound':
            return (
                <EntryNotFoundView
                    backTo={backTo}
                    isWorkspaceFound={state.isWorkspaceFound}
                />
            );
        case 'throttled':
        case 'unsupportedCurrency':
            return (
                <EntryErrorView
                    reason={state.kind}
                    workspaceName={workspaceName}
                    backTo={backTo}
                />
            );
        case 'connected':
            return (
                <ConnectedBankAccountView
                    account={account}
                    policyID={ref.policyID}
                    backTo={backTo}
                    isNonUSD={state.isNonUSD}
                />
            );
        case 'pendingValidation':
            return (
                <PendingValidationView
                    dataSource={dataSource}
                    policyID={ref.policyID}
                    backTo={backTo}
                />
            );
        case 'resumeSetup':
            return (
                <ResumeSetupOptions
                    account={account}
                    policyID={ref.policyID}
                    workspaceName={workspaceName}
                    isNonUSD={state.isNonUSD}
                    backTo={backTo}
                />
            );
        case 'newSetup':
        default:
            return (
                <NewSetupOptions
                    policyID={ref.policyID}
                    workspaceName={workspaceName}
                    currency={state.currency}
                    isNonUSD={state.isNonUSD}
                    isChangingBankAccount={isChangingBankAccount}
                    backTo={backTo}
                />
            );
    }
}

export default OnboardingEntryPage;
