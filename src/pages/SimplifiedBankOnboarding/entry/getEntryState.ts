/**
 * What the entry page shows, decided in one pure chain from the data of the render. The order is the order of the
 * baseline page: the blockers first, then the account states, then the setup options. The page renders the result with
 * a `switch`, so no state is mirrored and no effect decides what the user sees.
 */
import getNonUSDCurrency from '@pages/SimplifiedBankOnboarding/model/getNonUSDCurrency';
import {hasInProgressSetup, isConnected, isNonUSDCurrency, isPendingValidation, isSupportedCurrency} from '@pages/SimplifiedBankOnboarding/model/setupStatus';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/types/form';
import type {OnboardingAccount, Workspaces} from '@pages/SimplifiedBankOnboarding/types/onyx';

import CONST from '@src/CONST';

import type {OnyxEntry} from 'react-native-onyx';

import type {AccountRef} from './getAccountRef';

import {hasAccountRef, isAccountOfRef} from './getAccountRef';

type EntryState =
    | {kind: 'offline'}
    | {kind: 'loading'}
    | {
          kind: 'notFound';

          /** The workspace exists but the user is not its admin */
          isWorkspaceFound: boolean;
      }
    | {kind: 'throttled'}
    | {kind: 'unsupportedCurrency'}
    | {kind: 'connected'; isNonUSD: boolean}
    | {kind: 'pendingValidation'}
    /** A setup was started before, so the options are continue, change and start over */
    | {kind: 'resumeSetup'; isNonUSD: boolean}
    | {kind: 'newSetup'; isNonUSD: boolean; currency: string};

type EntryStateInput = {
    ref: AccountRef;
    account: OnyxEntry<OnboardingAccount>;
    workspaces: OnyxEntry<Workspaces>;
    draft: OnboardingDraft | undefined;
    isOffline: boolean;

    /** The page collects a new bank account while the connected one stays */
    isChangingBankAccount: boolean;

    /** The read of the account that this page started failed, and no newer one runs */
    hasReadFailed: boolean;
};

/**
 * The page may show the account key once it describes the account of the URL. The instance that changes the bank
 * account never reads, and a start over clears the account before the server answers, so both count as loaded.
 */
function isAccountOfPage({ref, account, isChangingBankAccount}: EntryStateInput): boolean {
    return isChangingBankAccount || account?.pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE || isAccountOfRef(account?.achData, ref);
}

function getEntryState(input: EntryStateInput): EntryState {
    const {ref, account, workspaces, draft, isOffline, isChangingBankAccount, hasReadFailed} = input;
    const isLoaded = isAccountOfPage(input);

    if (isOffline && !isLoaded) {
        return {kind: 'offline'};
    }
    if (!workspaces) {
        return {kind: 'loading'};
    }
    if (!hasAccountRef(ref)) {
        return {kind: 'notFound', isWorkspaceFound: false};
    }
    if (!isLoaded) {
        return hasReadFailed ? {kind: 'notFound', isWorkspaceFound: false} : {kind: 'loading'};
    }

    // A page opened by the bank account ID alone has no workspace to check, like the real page that the Wallet opens
    const workspace = ref.policyID ? workspaces[ref.policyID] : undefined;
    if (ref.policyID && workspace?.role !== SBO_CONST.WORKSPACE_ROLE.ADMIN) {
        return {kind: 'notFound', isWorkspaceFound: !!workspace};
    }
    if (account?.throttledDate) {
        return {kind: 'throttled'};
    }

    const achData = account?.achData;
    const currency = getNonUSDCurrency(workspaces, ref.policyID, achData, draft);
    if (currency && !isSupportedCurrency(currency)) {
        return {kind: 'unsupportedCurrency'};
    }

    const isNonUSD = isNonUSDCurrency(currency);
    if (!isChangingBankAccount && isConnected(achData, isNonUSD)) {
        return {kind: 'connected', isNonUSD};
    }

    // The validation step reads the workspace of the account, so a page opened by the bank account ID alone shows the options
    if (!isChangingBankAccount && currency === SBO_CONST.CURRENCY.USD && isPendingValidation(achData) && !!ref.policyID) {
        return {kind: 'pendingValidation'};
    }
    if (!isChangingBankAccount && hasInProgressSetup(achData, isNonUSD, ref.policyID)) {
        return {kind: 'resumeSetup', isNonUSD};
    }
    return {kind: 'newSetup', isNonUSD, currency};
}

export default getEntryState;
export type {EntryState};
