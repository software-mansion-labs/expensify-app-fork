/**
 * The reads that open the pages of the lab, and the write that validates the mock user.
 * They mirror `openReimbursementAccountPage` and the validate-code request of the real flow.
 */
/* eslint-disable rulesdir/prefer-actions-set-data -- This file is the action layer of an isolated research module, so it lives outside src/libs/actions */
import {getMicroSecondOnyxErrorWithTranslationKey} from '@libs/ErrorUtils';

import {READ_COMMANDS, WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {read, write} from '@pages/SimplifiedBankOnboarding/mockBackend/mockApi';
import {resetDatabase} from '@pages/SimplifiedBankOnboarding/mockBackend/serverDatabase';
import type {SetupType, USDStep} from '@pages/SimplifiedBankOnboarding/types/onyx';

import ONYXKEYS from '@src/ONYXKEYS';
import type {OnyxData} from '@src/types/onyx/Request';

import Onyx from 'react-native-onyx';

type OpenOnboardingPageParams = {
    /** The page names the workspace or the bank account. With the bank account, the server picks the step. */
    policyID?: string;
    bankAccountID?: number;

    /** The step that the client wants to show. The server answers with it when the account already reached that step. */
    stepToOpen?: USDStep | '';
    subStep?: SetupType | '';
    localCurrentStep?: USDStep | '';
};

function openLandingPage() {
    read(READ_COMMANDS.OPEN_LANDING_PAGE, {});
}

function getAccountLoadingDataForOnyx(): OnyxData<typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT> {
    return {
        optimisticData: [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, value: {isLoading: true}}],
        successData: [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, value: {isLoading: false}}],
        failureData: [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, value: {isLoading: false}}],
    };
}

function openOnboardingPage({policyID, bankAccountID, stepToOpen = '', subStep = '', localCurrentStep = ''}: OpenOnboardingPageParams) {
    read(READ_COMMANDS.OPEN_ONBOARDING_PAGE, {policyID, bankAccountID, stepToOpen, subStep, localCurrentStep}, getAccountLoadingDataForOnyx());
}

/**
 * The read of the page that stands in for the Payments tab of a workspace. Like `openWorkspaceView`, it belongs to a page
 * outside the flow and still raises `isLoading` on the account key, which the entry page takes for its own loading.
 */
function openWorkspacePaymentsPage() {
    read(READ_COMMANDS.OPEN_LANDING_PAGE, {}, getAccountLoadingDataForOnyx());
}

function validateUser(validateCode: string) {
    const onyxData: OnyxData<typeof ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_USER> = {
        optimisticData: [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_USER, value: {isLoading: true, errors: null}}],
        successData: [{onyxMethod: Onyx.METHOD.MERGE, key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_USER, value: {isLoading: false}}],
        failureData: [
            {
                onyxMethod: Onyx.METHOD.MERGE,
                key: ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_USER,
                value: {isLoading: false, errors: getMicroSecondOnyxErrorWithTranslationKey('validateCodeForm.error.incorrectSecurityCode')},
            },
        ],
    };
    write(WRITE_COMMANDS.VALIDATE_USER, {validateCode}, onyxData);
}

function clearValidateUserErrors() {
    Onyx.merge(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_USER, {errors: null});
}

/** Brings the mock server and every client key of the lab back to the state of a first visit */
function resetLabData() {
    resetDatabase();
    Onyx.multiSet({
        [ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT]: null,
        [ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_OPTION_PRESSED]: null,
        [ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PLAID_DATA]: null,
        [ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ONFIDO_TOKEN]: null,
        [ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_BANK_FIELDS]: null,
        [ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PICKLISTS]: null,
        [ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT]: null,
        [ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM_DRAFT]: null,
    }).then(openLandingPage);
}

export {clearValidateUserErrors, openLandingPage, openOnboardingPage, openWorkspacePaymentsPage, resetLabData, validateUser};
