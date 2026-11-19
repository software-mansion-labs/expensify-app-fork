/**
 * Actions that only change the client state of the onboarding: the draft and the flags that drive the screens. None of
 * them calls the server. They mirror `libs/actions/ReimbursementAccount`.
 */
/* eslint-disable rulesdir/prefer-actions-set-data -- This file is the action layer of an isolated research module, so it lives outside src/libs/actions */
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {OnboardingForm} from '@pages/SimplifiedBankOnboarding/types/form';
import type {ACHData, OnboardingAccount, SetupType} from '@pages/SimplifiedBankOnboarding/types/onyx';

import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

const DEFAULT_ACCOUNT: OnboardingAccount = {
    achData: {
        state: SBO_CONST.STATE.SETUP,
        currentStep: SBO_CONST.USD.STEP.BANK_ACCOUNT,
        subStep: '',
    },
    isLoading: false,
    errors: null,
    errorFields: null,
    maxAttemptsReached: false,
    shouldShowResetModal: false,
};

function updateOnboardingAccount(achData: Partial<ACHData>) {
    Onyx.merge(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {achData});
}

function updateOnboardingDraft(values: Partial<OnboardingForm>) {
    Onyx.merge(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT, values);
}

function clearOnboardingDraft() {
    Onyx.set(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT, {});
}

function clearOnboardingAccount() {
    Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, DEFAULT_ACCOUNT);
}

function setOnboardingAccountLoading(isLoading: boolean) {
    Onyx.merge(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {isLoading});
}

function clearOnboardingAccountErrors() {
    Onyx.merge(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {errors: null, pendingAction: null, errorFields: null});
}

/** Asks the entry page to show the modal that confirms starting over */
function requestResetBankAccount() {
    Onyx.merge(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {shouldShowResetModal: true});
}

function cancelResetBankAccount() {
    Onyx.merge(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {shouldShowResetModal: false});
}

/** Remembers the setup type that the user picked, so the choice survives the detour through the verify-account page */
function setSetupOptionPressed(optionPressed: SetupType | null) {
    Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_OPTION_PRESSED, optionPressed);
}

/** Clears the data of the connected bank account on the client, so the flow can collect a new one without disconnecting the old one first */
function prepareNewBankAccountSetup(policyID: string, currency: string) {
    Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {...DEFAULT_ACCOUNT, achData: {...DEFAULT_ACCOUNT.achData, policyID}});
    Onyx.set(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT, {currency});
}

export {
    DEFAULT_ACCOUNT,
    cancelResetBankAccount,
    clearOnboardingAccount,
    clearOnboardingAccountErrors,
    clearOnboardingDraft,
    prepareNewBankAccountSetup,
    requestResetBankAccount,
    setOnboardingAccountLoading,
    setSetupOptionPressed,
    updateOnboardingAccount,
    updateOnboardingDraft,
};
