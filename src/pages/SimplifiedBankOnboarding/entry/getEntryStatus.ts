/**
 * Decides which screen the entry page shows. The checks run in the order of the early returns of the page before this
 * experiment, so the same data shows the same screen, but nothing is mirrored in state: the status follows the data on
 * every render, also after a reset or a replacement of the bank account.
 */
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {ACHData, USDStep, Workspace} from '@pages/SimplifiedBankOnboarding/types/onyx';
import {hasInProgressSetup, isAccountForRoute, isSupportedCurrency} from '@pages/SimplifiedBankOnboarding/utils/OnboardingAccountUtils';
import type {RouteIdentity} from '@pages/SimplifiedBankOnboarding/utils/OnboardingAccountUtils';

type EntryStatus =
    | 'offlineBlocked'
    | 'loadingWorkspaces'
    | 'loading'
    | 'notFound'
    | 'notAuthorized'
    | 'throttled'
    | 'unsupportedCurrency'
    | 'connected'
    | 'pendingValidation'
    | 'continueSetup'
    | 'chooseSetup';

type EntryStatusInput = {
    achData: ACHData | undefined;
    throttledDate: string | undefined;

    /** The workspace of the URL. Undefined for a page opened by the bank account ID, or when the workspace does not exist. */
    workspace: Workspace | undefined;
    areWorkspacesLoaded: boolean;
    route: RouteIdentity;

    /** The currency of the workspace, or of the account for a page opened by the bank account ID */
    currency: string | undefined;

    /** True on the instance that collects a new bank account while the old one is still connected */
    isChangingBankAccount: boolean;
    isOffline: boolean;

    /** The state of the read that the entry page sent itself. Reads of other pages do not count. */
    accountRead: {isPending: boolean; hasFailed: boolean};
};

const {STEP} = SBO_CONST.USD;

/** The steps whose data is on the device, so the page can be shown without a connection */
const OFFLINE_ACCESSIBLE_STEPS = new Set<USDStep>([STEP.COUNTRY, STEP.BANK_ACCOUNT, STEP.REQUESTOR, STEP.COMPANY]);

function isAvailableOffline(achData: ACHData | undefined): boolean {
    const step = achData?.currentStep ?? STEP.COUNTRY;
    return OFFLINE_ACCESSIBLE_STEPS.has(step);
}

function isNonUSDCurrency(currency: string | undefined): boolean {
    return !!currency && currency !== SBO_CONST.CURRENCY.USD;
}

/** The USD flow ends on the enable step, the NonUSD flow has no steps from the server and ends in the open state */
function isConnected(achData: ACHData | undefined, currency: string | undefined): boolean {
    return isNonUSDCurrency(currency) ? achData?.state === SBO_CONST.STATE.OPEN : achData?.currentStep === STEP.ENABLE;
}

function getEntryStatus({achData, throttledDate, workspace, areWorkspacesLoaded, route, currency, isChangingBankAccount, isOffline, accountRead}: EntryStatusInput): EntryStatus {
    const isDataForRoute = isAccountForRoute(achData, route);

    if (isOffline && !isDataForRoute) {
        return 'offlineBlocked';
    }
    if (!areWorkspacesLoaded) {
        return 'loadingWorkspaces';
    }

    // The replacement starts from the data of the connected account that the page under it holds, so it waits for nothing.
    if (!isChangingBankAccount) {
        const hasIdentity = !!route.policyID || !!route.bankAccountID;
        if (!hasIdentity || (accountRead.hasFailed && !isDataForRoute)) {
            return 'notFound';
        }
        if ((accountRead.isPending || !isDataForRoute) && !(isOffline && isAvailableOffline(achData))) {
            return 'loading';
        }
    }

    // A page without a workspace ID is not checked, like the real page that the Wallet opens by the bank account ID.
    if (route.policyID) {
        if (!workspace) {
            return 'notFound';
        }
        if (workspace.role !== SBO_CONST.WORKSPACE_ROLE.ADMIN) {
            return 'notAuthorized';
        }
    }

    if (throttledDate) {
        return 'throttled';
    }
    if (currency && !isSupportedCurrency(currency)) {
        return 'unsupportedCurrency';
    }
    if (isChangingBankAccount) {
        return 'chooseSetup';
    }
    if (isConnected(achData, currency)) {
        return 'connected';
    }

    // A pending USD account has nothing to pick here. Only a workspace page redirects, because the validation step needs the workspace ID.
    if (currency === SBO_CONST.CURRENCY.USD && achData?.state === SBO_CONST.STATE.PENDING && !!route.policyID && achData.policyID === route.policyID) {
        return 'pendingValidation';
    }
    if (hasInProgressSetup(achData, isNonUSDCurrency(currency), route.policyID)) {
        return 'continueSetup';
    }
    return 'chooseSetup';
}

export default getEntryStatus;
export {isNonUSDCurrency};
export type {EntryStatus, EntryStatusInput};
