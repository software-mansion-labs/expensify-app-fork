import getEntryStatus from '@pages/SimplifiedBankOnboarding/entry/getEntryStatus';
import type {EntryStatus, EntryStatusInput} from '@pages/SimplifiedBankOnboarding/entry/getEntryStatus';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {ACHData, Workspace} from '@pages/SimplifiedBankOnboarding/types/onyx';
import {isAccountForRoute} from '@pages/SimplifiedBankOnboarding/utils/OnboardingAccountUtils';
import type {RouteIdentity} from '@pages/SimplifiedBankOnboarding/utils/OnboardingAccountUtils';

const {STEP} = SBO_CONST.USD;
const POLICY_ID = 'usd';
const OTHER_POLICY_ID = 'eur';
const BANK_ACCOUNT_ID = 1001;

const USD_WORKSPACE: Workspace = {id: POLICY_ID, name: 'Acme US', outputCurrency: SBO_CONST.CURRENCY.USD, role: SBO_CONST.WORKSPACE_ROLE.ADMIN};

/** A USD account in progress the way the mock server returns it after the bank step */
function buildACHData(overrides: Partial<ACHData> = {}): ACHData {
    return {
        bankAccountID: BANK_ACCOUNT_ID,
        policyID: POLICY_ID,
        state: SBO_CONST.STATE.SETUP,
        currency: SBO_CONST.CURRENCY.USD,
        currentStep: STEP.REQUESTOR,
        ...overrides,
    };
}

/** The input of a workspace page whose own read finished online, with the data of that workspace loaded */
function buildInput(overrides: Partial<EntryStatusInput> = {}): EntryStatusInput {
    return {
        achData: buildACHData(),
        throttledDate: undefined,
        workspace: USD_WORKSPACE,
        areWorkspacesLoaded: true,
        route: {policyID: POLICY_ID},
        currency: SBO_CONST.CURRENCY.USD,
        isChangingBankAccount: false,
        isOffline: false,
        accountRead: {isPending: false, hasFailed: false},
        ...overrides,
    };
}

describe('isAccountForRoute', () => {
    test.each<[string, ACHData | undefined, RouteIdentity, boolean]>([
        ['the data of the workspace of the URL', buildACHData(), {policyID: POLICY_ID}, true],
        ['the data of another workspace', buildACHData({policyID: OTHER_POLICY_ID}), {policyID: POLICY_ID}, false],
        ['the bank account of the URL', buildACHData(), {bankAccountID: BANK_ACCOUNT_ID}, true],
        ['another bank account', buildACHData({bankAccountID: 2002}), {bankAccountID: BANK_ACCOUNT_ID}, false],
        ['the bank account of the URL when the URL also names another workspace', buildACHData({policyID: OTHER_POLICY_ID}), {policyID: POLICY_ID, bankAccountID: BANK_ACCOUNT_ID}, true],
        ['the data that a reset removed', undefined, {policyID: POLICY_ID}, false],
        ['any data for a URL that names nothing', buildACHData(), {}, false],
    ])('accepts %s: %s', (_, achData, route, expected) => {
        // Given account data and the identity that the URL of a page holds

        // When the page checks whether the data is its own
        const result = isAccountForRoute(achData, route);

        // Then only data that names the bank account, or else the workspace, of the URL belongs to the page
        expect(result).toBe(expected);
    });
});

describe('getEntryStatus', () => {
    test.each<[string, Partial<EntryStatusInput>, EntryStatus]>([
        // Order 1: offline
        ['offline with the data of another workspace', {isOffline: true, achData: buildACHData({policyID: OTHER_POLICY_ID})}, 'offlineBlocked'],
        ['offline with no data', {isOffline: true, achData: undefined}, 'offlineBlocked'],
        ['offline with the data of this workspace on a step that works offline', {isOffline: true}, 'continueSetup'],

        // Order 2: workspaces
        ['before the workspaces are loaded', {areWorkspacesLoaded: false}, 'loadingWorkspaces'],

        // Order 3: the own read and the identity check
        ['while the own read is pending', {accountRead: {isPending: true, hasFailed: false}}, 'loading'],
        ['with the data of another workspace', {achData: buildACHData({policyID: OTHER_POLICY_ID})}, 'loading'],
        ['with the data of another bank account', {route: {bankAccountID: BANK_ACCOUNT_ID}, achData: buildACHData({bankAccountID: 2002})}, 'loading'],
        ['while the own read is pending offline on a step that works offline', {isOffline: true, accountRead: {isPending: true, hasFailed: false}}, 'continueSetup'],
        [
            'while the own read is pending offline on a step that needs the connection',
            {isOffline: true, accountRead: {isPending: true, hasFailed: false}, achData: buildACHData({currentStep: STEP.ACH_CONTRACT})},
            'loading',
        ],
        ['after the own read failed with no data', {achData: undefined, accountRead: {isPending: false, hasFailed: true}}, 'notFound'],
        ['for a URL that names nothing', {route: {}}, 'notFound'],

        // Order 4: the workspace
        ['for a workspace that does not exist', {workspace: undefined}, 'notFound'],
        ['for a workspace where the user is not an admin', {workspace: {...USD_WORKSPACE, role: SBO_CONST.WORKSPACE_ROLE.USER}}, 'notAuthorized'],
        ['for a page opened by the bank account, which has no workspace to check', {route: {bankAccountID: BANK_ACCOUNT_ID}, workspace: undefined}, 'continueSetup'],

        // Order 5: blockers of the account
        ['for a throttled account', {throttledDate: '2026-11-19'}, 'throttled'],
        ['for an unsupported currency', {currency: 'JPY', workspace: {...USD_WORKSPACE, outputCurrency: 'JPY'}}, 'unsupportedCurrency'],

        // Order 6: connected
        ['for a connected USD account', {achData: buildACHData({currentStep: STEP.ENABLE, state: SBO_CONST.STATE.OPEN})}, 'connected'],
        ['for a connected NonUSD account', {currency: SBO_CONST.CURRENCY.EUR, achData: buildACHData({state: SBO_CONST.STATE.OPEN, currency: SBO_CONST.CURRENCY.EUR})}, 'connected'],

        // Order 7: pending validation
        ['for a pending USD account', {achData: buildACHData({currentStep: STEP.VALIDATION, state: SBO_CONST.STATE.PENDING})}, 'pendingValidation'],
        [
            'for a pending USD account opened by the bank account, which has no workspace for the validation step',
            {route: {bankAccountID: BANK_ACCOUNT_ID}, workspace: undefined, achData: buildACHData({currentStep: STEP.VALIDATION, state: SBO_CONST.STATE.PENDING})},
            'continueSetup',
        ],

        // Order 8 and 9: the entry point
        ['for a USD setup in progress', {}, 'continueSetup'],
        ['for a NonUSD setup past the bank step', {currency: SBO_CONST.CURRENCY.EUR, achData: buildACHData({currency: SBO_CONST.CURRENCY.EUR, created: '2026-11-19'})}, 'continueSetup'],
        ['for a NonUSD setup before the bank step', {currency: SBO_CONST.CURRENCY.EUR, achData: {policyID: POLICY_ID, currentStep: STEP.BANK_ACCOUNT}}, 'chooseSetup'],
        ['for a workspace with no account', {achData: {policyID: POLICY_ID, currentStep: STEP.BANK_ACCOUNT}}, 'chooseSetup'],
        ['after a reset succeeded, when the data names only the workspace', {achData: {policyID: POLICY_ID, state: SBO_CONST.STATE.SETUP, currentStep: STEP.BANK_ACCOUNT}}, 'chooseSetup'],

        // The replacement of a connected bank account
        ['on the replacement of a connected account', {isChangingBankAccount: true, achData: buildACHData({currentStep: STEP.ENABLE, state: SBO_CONST.STATE.OPEN})}, 'chooseSetup'],
        ['on the replacement while a read of the page under it is pending', {isChangingBankAccount: true, accountRead: {isPending: true, hasFailed: false}}, 'chooseSetup'],
        ['on the replacement of a throttled account', {isChangingBankAccount: true, throttledDate: '2026-11-19'}, 'throttled'],
    ])('shows %s: %s', (_, overrides, expected) => {
        // Given the account, the workspace and the state of the own read of an entry page
        const input = buildInput(overrides);

        // When the page decides what to show
        const status = getEntryStatus(input);

        // Then the first check of the baseline order that applies picks the screen
        expect(status).toBe(expected);
    });

    it('follows the data through a reset without any state of its own', () => {
        // Given a setup in progress
        const input = buildInput();
        expect(getEntryStatus(input)).toBe('continueSetup');

        // When the reset removes the data, and then succeeds with the data that names only the workspace
        const whileResetting = getEntryStatus({...input, achData: undefined});
        const afterReset = getEntryStatus({...input, achData: {policyID: POLICY_ID, state: SBO_CONST.STATE.SETUP, currentStep: STEP.BANK_ACCOUNT}});

        // Then the page waits for the data, then offers a new setup
        expect(whileResetting).toBe('loading');
        expect(afterReset).toBe('chooseSetup');
    });
});
