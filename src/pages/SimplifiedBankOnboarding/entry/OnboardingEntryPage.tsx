/**
 * The page that opens the bank onboarding of a workspace. It reads the account of the URL each time it is focused,
 * decides what to show in the pure `getEntryState` chain and renders one view per state. It mirrors
 * `ReimbursementAccountPage`, without its mirrored state and its navigation refs.
 */
import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';

import useNetwork from '@hooks/useNetwork';

import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';

import useFlowData from '@pages/SimplifiedBankOnboarding/controller/useFlowData';
import {leaveEntry} from '@pages/SimplifiedBankOnboarding/navigation/entryNavigation';
import {clearDraft} from '@pages/SimplifiedBankOnboarding/requests/draft';
import openOnboardingPage from '@pages/SimplifiedBankOnboarding/requests/entry/openOnboardingPage';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import useRequestState from '@pages/SimplifiedBankOnboarding/requests/useRequestState';

import CONST from '@src/CONST';
import type SCREENS from '@src/SCREENS';

import {useIsFocused} from '@react-navigation/native';
import React, {useEffect, useEffectEvent, useState} from 'react';

import getAccountRef, {isAccountOfRef} from './getAccountRef';
import getEntryState from './getEntryState';
import ConnectedBankAccountView from './views/ConnectedBankAccountView';
import EntryErrorView from './views/EntryErrorView';
import EntryNotFoundView from './views/EntryNotFoundView';
import EntryOfflineView from './views/EntryOfflineView';
import EntryOptionsView from './views/EntryOptionsView';
import PendingValidationView from './views/PendingValidationView';

type OnboardingEntryPageProps = PlatformStackScreenProps<BankOnboardingLabParamList, typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.ENTRY>;

function OnboardingEntryPage({route}: OnboardingEntryPageProps) {
    const isFocused = useIsFocused();
    const dataSource = useFlowData();
    const {account, workspaces, draft} = dataSource.data;
    const {isPending: isReadPending} = useRequestState(REQUEST_NAMES.OPEN_ONBOARDING_PAGE);

    // The outcome of the read that this page started. The request status may still hold the failure of an older read.
    const [hasReadFailed, setHasReadFailed] = useState(false);

    const policyIDParam = route.params?.policyID;
    const bankAccountIDParam = route.params?.bankAccountID;
    const backTo = route.params?.backTo;
    const isChangingBankAccount = !!route.params?.isChangingBankAccount;
    const ref = getAccountRef(policyIDParam, bankAccountIDParam, workspaces, account?.achData);

    // The instance that changes the bank account shares the data of the instance under it, so it never reads
    const readAccount = () => {
        if (isChangingBankAccount || (!policyIDParam && !bankAccountIDParam)) {
            return;
        }
        const request = bankAccountIDParam ? openOnboardingPage({bankAccountID: Number(bankAccountIDParam)}) : openOnboardingPage({policyID: policyIDParam});
        request.then((outcome) => setHasReadFailed(outcome.status === 'failed'));
    };

    const readOnFocus = useEffectEvent(() => {
        // The draft of another account must not prefill this one
        if (!isChangingBankAccount && !isAccountOfRef(account?.achData, ref)) {
            clearDraft();
        }
        readAccount();
    });

    // A start over waits for its own answer, so the reconnect only reads when no reset is on its way
    const {isOffline} = useNetwork({
        onReconnect: () => {
            if (account?.pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE) {
                return;
            }
            readAccount();
        },
    });

    // Every focus reads again, because the server may have moved on, and a change of the bank account that the user
    // abandoned leaves the shared key without the connected account that this page shows
    useEffect(() => {
        if (!isFocused) {
            return;
        }
        readOnFocus();
    }, [isFocused, policyIDParam, bankAccountIDParam]);

    const state = getEntryState({ref, account, workspaces, draft, isOffline, isChangingBankAccount, hasReadFailed: hasReadFailed && !isReadPending});
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
        case 'options':
        default:
            return (
                <EntryOptionsView
                    dataSource={dataSource}
                    policyID={ref.policyID}
                    workspaceName={workspaceName}
                    currency={state.currency}
                    isNonUSD={state.isNonUSD}
                    isSetupInProgress={state.isSetupInProgress}
                    isChangingBankAccount={isChangingBankAccount}
                    backTo={backTo}
                />
            );
    }
}

export default OnboardingEntryPage;
