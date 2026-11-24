/**
 * Where the entry page and the screens it opens lead to. The routes of the entry, the verify page and the lab live here,
 * so the views only say what the user does (leave, change the bank account, verify the account).
 */
import Navigation from '@libs/Navigation/Navigation';

import type {ACHData, USDStep} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {isPendingValidation} from '@pages/SimplifiedBankOnboarding/contract/setupStatus';

import type {Route} from '@src/ROUTES';
import ROUTES from '@src/ROUTES';

import type {OnyxEntry} from 'react-native-onyx';

/** The Back of the entry loader and of the connected view, which depends on the step that the account reached */
function goBackFromEntryStep(step: USDStep, achData: OnyxEntry<ACHData>, backTo: Route | undefined) {
    switch (step) {
        case SBO_CONST.USD.STEP.COUNTRY:
            Navigation.goBack(backTo);
            break;
        case SBO_CONST.USD.STEP.VALIDATION:
            if (isPendingValidation(achData)) {
                Navigation.dismissModal();
                break;
            }
            Navigation.goBack(backTo);
            break;
        default:
            Navigation.dismissModal();
    }
}

/** The gate for a user whose account is not validated yet */
function goToVerifyAccount(policyID: string | undefined, backTo: Route | undefined) {
    Navigation.navigate(ROUTES.SETTINGS_BANK_ONBOARDING_LAB_VERIFY_ACCOUNT.getRoute(policyID, backTo));
}

/** Opens a second instance of the entry that starts a fresh setup while the current bank account stays connected */
function goToChangeBankAccount(policyID: string | undefined, backTo: Route | undefined) {
    if (!policyID) {
        return;
    }
    Navigation.navigate(
        ROUTES.SETTINGS_BANK_ONBOARDING_LAB_ENTRY.getRoute({
            policyID,
            isChangingBankAccount: true,
            backTo,
        }),
    );
}

/** As in the real entry point, the return route doubles as data: only the Payments page offers to replace the bank account. */
function isOpenedFromPaymentsPage(policyID: string | undefined, backTo: Route | undefined): boolean {
    return !!policyID && backTo === ROUTES.SETTINGS_BANK_ONBOARDING_LAB_WORKSPACE_PAYMENTS.getRoute(policyID);
}

/** A setup opened from the bank account list returns to the list, because the reset removed the row that opened it */
function leaveEntryAfterReset(backTo: Route | undefined) {
    if (backTo !== ROUTES.SETTINGS_BANK_ONBOARDING_LAB) {
        return;
    }
    Navigation.goBack(ROUTES.SETTINGS_BANK_ONBOARDING_LAB);
}

export {goBackFromEntryStep, goToChangeBankAccount, goToVerifyAccount, isOpenedFromPaymentsPage, leaveEntryAfterReset};
