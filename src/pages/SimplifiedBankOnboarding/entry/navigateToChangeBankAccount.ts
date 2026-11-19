/**
 * Opens a second instance of the entry page that starts a fresh setup while the current bank account stays connected.
 * The flag only lives in the URL, so every screen that needs it reads it from its own route.
 */
import Navigation from '@libs/Navigation/Navigation';

import ROUTES from '@src/ROUTES';

function navigateToChangeBankAccount(policyID: string | undefined) {
    if (!policyID) {
        return;
    }
    Navigation.navigate(ROUTES.SETTINGS_BANK_ONBOARDING_LAB_ENTRY.getRoute({policyID, isChangingBankAccount: true}));
}

export default navigateToChangeBankAccount;
