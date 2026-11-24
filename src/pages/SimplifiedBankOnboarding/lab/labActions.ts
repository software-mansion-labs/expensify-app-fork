/* eslint-disable rulesdir/prefer-actions-set-data -- This file is the action layer of an isolated research module, so it lives outside src/libs/actions */
/** The reads that open the pages of the lab, and the reset of the lab. They mirror the reads of the real Payments tab. */
import {clearRequestState, getAccountLoadingData, runRequest} from '@pages/SimplifiedBankOnboarding/core';
import {READ_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {resetDatabase} from '@pages/SimplifiedBankOnboarding/mockBackend/serverDatabase';

import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

function openLandingPage() {
    runRequest({name: 'lab.landing.open', type: 'read', command: READ_COMMANDS.OPEN_LANDING_PAGE, params: {}});
}

/**
 * The read of the page that stands in for the Payments tab of a workspace. Like `openWorkspaceView`, it belongs to a page
 * outside the flow and still raises `isLoading` on the account key, which the entry page takes for its own loading.
 */
function openWorkspacePaymentsPage() {
    runRequest({name: 'lab.payments.open', type: 'read', command: READ_COMMANDS.OPEN_LANDING_PAGE, params: {}, onyxData: getAccountLoadingData()});
}

/** Brings the mock server and every client key of the lab back to the state of a first visit (BC-22: the request states too) */
function resetLabData() {
    resetDatabase();
    Promise.all([
        Onyx.multiSet({
            [ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT]: null,
            [ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_OPTION_PRESSED]: null,
            [ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PLAID_DATA]: null,
            [ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ONFIDO_TOKEN]: null,
            [ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_BANK_FIELDS]: null,
            [ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PICKLISTS]: null,
            [ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT]: null,
            [ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM_DRAFT]: null,
        }),
        clearRequestState(),
    ]).then(openLandingPage);
}

export {openLandingPage, openWorkspacePaymentsPage, resetLabData};
