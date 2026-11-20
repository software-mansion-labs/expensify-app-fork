/**
 * The reads that open the pages outside the flow, and the old import path of the entry requests. The frozen landing
 * pages and the mock server panel import from here, so the flow requests are forwarded from `requests/`.
 */
/* eslint-disable rulesdir/prefer-actions-set-data -- This file is the action layer of an isolated research module, so it lives outside src/libs/actions */
import {READ_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {read} from '@pages/SimplifiedBankOnboarding/mockBackend/mockApi';
import {resetDatabase} from '@pages/SimplifiedBankOnboarding/mockBackend/serverDatabase';
import openOnboardingPage from '@pages/SimplifiedBankOnboarding/requests/entry/openOnboardingPage';
import validateUser, {clearValidateUserErrors} from '@pages/SimplifiedBankOnboarding/requests/entry/validateUser';

import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

function openLandingPage() {
    read(READ_COMMANDS.OPEN_LANDING_PAGE, {});
}

/**
 * The read of the page that stands in for the Payments tab of a workspace. Like `openWorkspaceView`, it raises
 * `isLoading` on the account key. The flow no longer reads that flag, so the read cannot cover the flow with a loader.
 */
function openWorkspacePaymentsPage() {
    read(
        READ_COMMANDS.OPEN_LANDING_PAGE,
        {},
        {
            optimisticData: [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, value: {isLoading: true}}],
            successData: [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, value: {isLoading: false}}],
            failureData: [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, value: {isLoading: false}}],
        },
    );
}

/** Brings the mock server and every client key of the lab back to the state of a first visit */
function resetLabData() {
    resetDatabase();
    Onyx.multiSet({
        [ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT]: null,
        [ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS]: null,
        [ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PLAID_DATA]: null,
        [ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ONFIDO_TOKEN]: null,
        [ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_BANK_FIELDS]: null,
        [ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PICKLISTS]: null,
        [ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT]: null,
        [ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM_DRAFT]: null,
    }).then(openLandingPage);
}

export {clearValidateUserErrors, openLandingPage, openOnboardingPage, openWorkspacePaymentsPage, resetLabData, validateUser};
