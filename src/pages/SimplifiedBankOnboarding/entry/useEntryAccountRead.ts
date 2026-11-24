/**
 * The loading rules of the entry and its cleanup on unmount (F031-F035).
 *
 * What it hides:
 * - the read of the account by the bank account ID, or by the workspace with the step params of the server step (BC-10)
 * - the read when the account key does not describe the workspace of the page (missing, another workspace, or no
 *   policyID): it raises `account.isLoading` and clears the main-form draft first (ENTRY-AND-SHARED-26)
 * - the read after an abandoned bank account change, which brings the connected view back
 * - the read after a reconnect, unless the account is being deleted
 * - the cleanup on unmount: the draft, and the account unless the entry redirected to the USD validation step and the
 *   user has not left that step. The changing instance cleans nothing, because the instance under it still needs the data.
 */
import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';

import {getSetupCurrency, isNonUSDCurrency} from '@pages/SimplifiedBankOnboarding/contract/currency';
import {belongsToPolicy, hasInProgressSetup, isConnected} from '@pages/SimplifiedBankOnboarding/contract/setupStatus';
import {clearDraft, useAccountRead} from '@pages/SimplifiedBankOnboarding/core';
import type {AccountReadParams} from '@pages/SimplifiedBankOnboarding/core';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import {useIsFocused} from '@react-navigation/native';
import {useEffect, useEffectEvent, useRef} from 'react';

import {getEntryStep} from './getEntryState';
import {clearOnboardingAccount, startAccountLoading} from './requests/resetBankAccount';

type EntryAccountReadInput = {
    policyID: string | undefined;
    bankAccountID: number | undefined;

    /** The second instance of the entry that collects a new bank account while the old one stays connected */
    isChangingBankAccount: boolean;
};

type EntryAccountRead = {
    isReadPending: boolean;
    hasReadFailed: boolean;

    /** Called by the redirect to the USD validation step, which reads the account and fetches nothing */
    keepAccountOnUnmount: () => void;

    /** Called when the user leaves the validation step, so nothing reads the account anymore */
    releaseAccountOnUnmount: () => void;
};

/** Like the real page, a route names the bank account or the workspace, and the bank account wins */
function getReadParams(policyID: string | undefined, bankAccountID: number | undefined): AccountReadParams | undefined {
    if (bankAccountID) {
        return {bankAccountID};
    }
    return policyID ? {policyID} : undefined;
}

function useEntryAccountRead({policyID, bankAccountID, isChangingBankAccount}: EntryAccountReadInput): EntryAccountRead {
    const isFocused = useIsFocused();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);
    const [workspaces] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES);
    const {readAccount, isReadPending, hasReadFailed} = useAccountRead(getReadParams(policyID, bankAccountID), {shouldReadOnReconnect: false});

    const achData = account?.achData;
    const workspace = policyID ? workspaces?.[policyID] : undefined;
    const isNonUSD = isNonUSDCurrency(getSetupCurrency(workspace, achData, draft));
    const isAccountOfThisWorkspace = !!account && belongsToPolicy(achData, policyID);
    const isShowingConnectedAccount = isConnected(achData, isNonUSD);
    const hasSetupInProgress = hasInProgressSetup(achData, isNonUSD, policyID);

    // A reset empties the account until its answer arrives, and reads the account itself when it fails. A read of this
    // page during that time would land after the error of the failed reset and wipe it.
    const isResetRunning = account?.pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE;

    const isChangingInstanceRef = useRef(isChangingBankAccount);
    const shouldKeepAccountRef = useRef(false);
    const hasShownConnectedAccountRef = useRef(false);

    /** After a reconnect the read asks for the step that the entry stands on, which is the server step (BC-10) */
    function readAccountOfPage(shouldAskForEntryStep = false) {
        if (bankAccountID) {
            readAccount();
            return;
        }
        const entryStep = getEntryStep(account, draft);
        const serverStep = isAccountOfThisWorkspace ? (achData?.currentStep ?? '') : '';
        readAccount({
            stepToOpen: shouldAskForEntryStep ? entryStep : '',
            subStep: isAccountOfThisWorkspace ? (achData?.subStep ?? '') : '',
            localCurrentStep: shouldAskForEntryStep ? entryStep : serverStep,
        });
    }

    const readAccountOfOtherWorkspace = useEffectEvent(() => {
        if (isAccountOfThisWorkspace || isResetRunning) {
            return;
        }
        if (policyID) {
            startAccountLoading();
            clearDraft();
        }
        readAccountOfPage();
    });

    // The read makes the account belong to this workspace, which is the only change that this effect waits for.
    useEffect(() => {
        readAccountOfOtherWorkspace();
    }, [isAccountOfThisWorkspace]);

    const readAfterAbandonedChange = useEffectEvent(() => {
        if (isResetRunning) {
            return;
        }
        readAccountOfPage();
    });

    // Replacing a bank account clears the shared data. When the user backs out of the replacement, the focus returns
    // here without the connected account that this page was showing, so the page reads it again.
    useEffect(() => {
        if (isChangingBankAccount || !isFocused) {
            return;
        }
        if (isShowingConnectedAccount) {
            hasShownConnectedAccountRef.current = true;
            return;
        }
        if (!hasSetupInProgress && hasShownConnectedAccountRef.current) {
            readAfterAbandonedChange();
        }
    }, [isFocused, isChangingBankAccount, isShowingConnectedAccount, hasSetupInProgress]);

    useNetwork({
        onReconnect: () => {
            if (!account || isResetRunning) {
                return;
            }
            readAccountOfPage(true);
        },
    });

    useEffect(() => {
        const isChangingInstance = isChangingInstanceRef.current;
        return () => {
            if (isChangingInstance) {
                return;
            }
            clearDraft();
            if (!shouldKeepAccountRef.current) {
                clearOnboardingAccount();
            }
        };
    }, []);

    const keepAccountOnUnmount = () => {
        shouldKeepAccountRef.current = true;
    };
    const releaseAccountOnUnmount = () => {
        shouldKeepAccountRef.current = false;
    };

    return {
        isReadPending,
        hasReadFailed,
        keepAccountOnUnmount,
        releaseAccountOnUnmount,
    };
}

export default useEntryAccountRead;
export type {EntryAccountRead, EntryAccountReadInput};
