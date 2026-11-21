/**
 * The navigation calls of the entry page and the verify account page, and the checks that read the return route as
 * data. Like the real entry point, the page offers to replace a bank account only when the Payments page opened it, and
 * it returns to the lab list after a start over only when that list opened it.
 */
import Navigation from '@libs/Navigation/Navigation';

import ROUTES from '@src/ROUTES';
import type {Route} from '@src/ROUTES';

/** The page that the link of the unsupported currency error opens */
const CURRENCY_SETTINGS_ROUTE = ROUTES.SETTINGS_BANK_ONBOARDING_LAB;

/** Returns to the page that opened the entry page */
function leaveEntry(backTo: Route | undefined) {
    Navigation.goBack(backTo);
}

/** Opens the gate of a user who is not validated yet. The page that passes it replaces itself with the flow. */
function goToVerifyAccount(policyID: string | undefined, backTo: Route | undefined) {
    Navigation.navigate(ROUTES.SETTINGS_BANK_ONBOARDING_LAB_VERIFY_ACCOUNT.getRoute(policyID, backTo));
}

function leaveVerifyAccount() {
    Navigation.goBack();
}

/**
 * Opens a second entry page that starts a fresh setup while the connected bank account stays. The return route goes
 * along, so the new setup returns to the page that opened the first entry page.
 */
function goToChangeBankAccount(policyID: string | undefined, backTo: Route | undefined) {
    if (!policyID) {
        return;
    }
    Navigation.navigate(ROUTES.SETTINGS_BANK_ONBOARDING_LAB_ENTRY.getRoute({policyID, isChangingBankAccount: true, backTo}));
}

function isOpenedFromPaymentsPage(policyID: string | undefined, backTo: Route | undefined): boolean {
    return !!policyID && backTo === ROUTES.SETTINGS_BANK_ONBOARDING_LAB_WORKSPACE_PAYMENTS.getRoute(policyID);
}

/** A start over removes the bank account row of the lab list, so a setup opened from that row returns to the list */
function leaveEntryAfterReset(backTo: Route | undefined) {
    if (backTo !== ROUTES.SETTINGS_BANK_ONBOARDING_LAB) {
        return;
    }
    Navigation.goBack(ROUTES.SETTINGS_BANK_ONBOARDING_LAB);
}

export {CURRENCY_SETTINGS_ROUTE, goToChangeBankAccount, goToVerifyAccount, isOpenedFromPaymentsPage, leaveEntry, leaveEntryAfterReset, leaveVerifyAccount};
