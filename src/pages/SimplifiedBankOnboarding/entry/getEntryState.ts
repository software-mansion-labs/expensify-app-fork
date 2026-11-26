/**
 * What the entry page shows, decided from the data alone. The order of the checks is the order of the entry screens
 * (ENTRY-AND-SHARED-37..43): offline, loading, not found, throttled or unsupported currency, connected, pending
 * validation, options. The page renders the state, so the rules can be tested without rendering anything.
 */
import {getSetupCurrency, isNonUSDCurrency, isSupportedCurrency} from '@pages/SimplifiedBankOnboarding/contract/currency';
import {DEFAULT_ACCOUNT} from '@pages/SimplifiedBankOnboarding/contract/defaultAccount';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {ACHData, OnboardingAccount, USDStep, Workspaces} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {belongsToPolicy, hasInProgressSetup, isConnected, isPendingValidation} from '@pages/SimplifiedBankOnboarding/contract/setupStatus';

import {isEmptyObject} from '@src/types/utils/EmptyObject';

import type {OnyxEntry} from 'react-native-onyx';

import {deepEqual} from 'fast-equals';

type EntryState =
    | {kind: 'offline'}
    | {kind: 'loading'; waitsFor: 'workspaces' | 'account'}
    | {kind: 'notFound'; isWorkspaceFound: boolean}
    | {kind: 'throttled'}
    | {kind: 'unsupportedCurrency'}
    | {kind: 'connected'; isNonUSD: boolean}
    | {kind: 'pendingValidation'}
    | {
          kind: 'options';
          isNonUSD: boolean;
          currency: string | undefined;
          canContinue: boolean;
      };

type EntryStateInput = {
    policyID: string | undefined;
    bankAccountID: number | undefined;
    account: OnyxEntry<OnboardingAccount>;
    workspaces: OnyxEntry<Workspaces>;
    draft: OnyxEntry<OnboardingDraft>;
    isOffline: boolean;

    /** The second instance of the entry that collects a new bank account while the old one stays connected */
    isChangingBankAccount: boolean;
    isReadPending: boolean;
    hasReadFailed: boolean;
};

const {STEP} = SBO_CONST.USD;

/** The USD step that the entry stands on. The country step only exists on the client, so the server step counts once the user got past it. */
function getEntryStep(account: OnyxEntry<OnboardingAccount>, draft: OnyxEntry<OnboardingDraft>): USDStep {
    const achData = account?.achData;
    const hasConfirmedUSDCurrency = (draft?.country ?? '') !== '' || (achData?.accountNumber ?? '') !== '';
    return hasConfirmedUSDCurrency ? (achData?.currentStep ?? STEP.COUNTRY) : STEP.COUNTRY;
}

/**
 * The data describes a connected account that the page shows. The account key is shared by every workspace, so a
 * connected account of another workspace does not count. A page without a workspace ID takes the data as it is.
 */
function isConnectedAccountOfPage(achData: OnyxEntry<ACHData>, isNonUSD: boolean, policyID: string | undefined): boolean {
    return isConnected(achData, isNonUSD) && (!policyID || belongsToPolicy(achData, policyID));
}

/** The rows of the entry wait while the account has a pending action, and stay off while an error can still be dismissed */
function areAccountActionsDisabled(account: OnyxEntry<OnboardingAccount>): boolean {
    return !!account?.pendingAction || (!isEmptyObject(account?.errors ?? {}) && !account?.maxAttemptsReached);
}

function getEntryState({policyID, bankAccountID, account, workspaces, draft, isOffline, isChangingBankAccount, isReadPending, hasReadFailed}: EntryStateInput): EntryState {
    const achData = account?.achData;
    const workspace = policyID ? workspaces?.[policyID] : undefined;
    const currency = getSetupCurrency(workspace, achData, draft);
    const isNonUSD = isNonUSDCurrency(currency);
    const isLoading = !!account?.isLoading || isReadPending;
    const hasLoadedData = !!achData && !deepEqual(account, DEFAULT_ACCOUNT) && !isLoading;

    // The account key is shared by every workspace, so data that names another workspace or bank account is not data of this page.
    const isAccountOfOtherWorkspace = !!policyID && !belongsToPolicy(achData, policyID);
    const isOtherAccount = bankAccountID ? achData?.bankAccountID !== bankAccountID : isAccountOfOtherWorkspace;
    const hasDataForThisPage = !isEmptyObject(achData) && !deepEqual(achData, DEFAULT_ACCOUNT.achData) && !isOtherAccount;

    if (isOffline && (!hasLoadedData || !hasDataForThisPage)) {
        return {kind: 'offline'};
    }

    if (!workspaces) {
        return {kind: 'loading', waitsFor: 'workspaces'};
    }

    // Offline, the check above already showed the blocking view unless the loaded data belongs to this page.
    const isAuthorized = workspace?.role === SBO_CONST.WORKSPACE_ROLE.ADMIN;
    const isWaitingForAccount = (!!policyID || !!bankAccountID) && !isChangingBankAccount && (!hasLoadedData || isAccountOfOtherWorkspace);
    if (isWaitingForAccount) {
        // An admin keeps waiting after a failed read, because "not authorized" would be wrong for them
        return hasReadFailed && !isAuthorized ? {kind: 'notFound', isWorkspaceFound: !!workspace} : {kind: 'loading', waitsFor: 'account'};
    }

    // A page without a workspace ID is not checked, like the real page that the Wallet opens by the bank account ID.
    if (!!policyID && !isLoading && !isAuthorized) {
        return {kind: 'notFound', isWorkspaceFound: !!workspace};
    }

    // A pending USD account has nothing to pick on this page, so the page only redirects an admin to the validation step.
    // This comes before the throttled view, because the validation step is where a throttled account shows its state.
    const shouldRedirectToPendingValidation =
        currency === SBO_CONST.CURRENCY.USD && isPendingValidation(achData) && hasLoadedData && !isChangingBankAccount && belongsToPolicy(achData, policyID) && isAuthorized;
    if (shouldRedirectToPendingValidation) {
        return {kind: 'pendingValidation'};
    }

    if (account?.throttledDate) {
        return {kind: 'throttled'};
    }
    if (currency !== undefined && !isSupportedCurrency(currency)) {
        return {kind: 'unsupportedCurrency'};
    }

    // The instance that replaces the bank account shows the setup options, although the shared data still describes the connected account.
    if (!isChangingBankAccount && isConnectedAccountOfPage(achData, isNonUSD, policyID)) {
        return {kind: 'connected', isNonUSD};
    }

    return {
        kind: 'options',
        isNonUSD,
        currency,
        canContinue: !isChangingBankAccount && hasInProgressSetup(achData, isNonUSD, policyID),
    };
}

export default getEntryState;
export {areAccountActionsDisabled, getEntryStep, isConnectedAccountOfPage};
export type {EntryState, EntryStateInput};
