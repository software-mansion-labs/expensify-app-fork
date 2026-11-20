import getAccountRef, {hasAccountRef, isAccountOfRef} from '@pages/SimplifiedBankOnboarding/entry/getAccountRef';
import type {AccountRef} from '@pages/SimplifiedBankOnboarding/entry/getAccountRef';
import getEntryState from '@pages/SimplifiedBankOnboarding/entry/getEntryState';
import type {EntryState} from '@pages/SimplifiedBankOnboarding/entry/getEntryState';
import DEFAULT_ACCOUNT from '@pages/SimplifiedBankOnboarding/model/defaultAccount';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {ACHData, OnboardingAccount, Workspaces} from '@pages/SimplifiedBankOnboarding/types/onyx';

import CONST from '@src/CONST';

const {STATE, CURRENCY, WORKSPACE_ROLE} = SBO_CONST;
const {STEP} = SBO_CONST.USD;

const BANK_ACCOUNT_ID = 1001;

const WORKSPACES: Workspaces = {
    usd: {
        id: 'usd',
        name: 'Acme US',
        outputCurrency: CURRENCY.USD,
        role: WORKSPACE_ROLE.ADMIN,
        achAccount: {bankAccountID: BANK_ACCOUNT_ID, state: STATE.SETUP},
    },
    eur: {
        id: 'eur',
        name: 'Acme EU',
        outputCurrency: CURRENCY.EUR,
        role: WORKSPACE_ROLE.ADMIN,
    },
    gbp: {
        id: 'gbp',
        name: 'Acme UK',
        outputCurrency: 'GBP',
        role: WORKSPACE_ROLE.ADMIN,
    },
    member: {
        id: 'member',
        name: 'Someone else',
        outputCurrency: CURRENCY.USD,
        role: WORKSPACE_ROLE.USER,
    },
};

/** What the open-page read returns for a workspace without a bank account */
function newAccount(policyID: string): OnboardingAccount {
    return {achData: {policyID, currentStep: STEP.BANK_ACCOUNT, subStep: ''}};
}

function accountWith(achData: ACHData): OnboardingAccount {
    return {achData: {bankAccountID: BANK_ACCOUNT_ID, ...achData}};
}

const USD_IN_SETUP = accountWith({
    policyID: 'usd',
    state: STATE.SETUP,
    currentStep: STEP.REQUESTOR,
});
const USD_PENDING = accountWith({
    policyID: 'usd',
    state: STATE.PENDING,
    currentStep: STEP.VALIDATION,
    currency: CURRENCY.USD,
});
const USD_CONNECTED = accountWith({
    policyID: 'usd',
    state: STATE.OPEN,
    currentStep: STEP.ENABLE,
});
const EUR_CREATED = accountWith({
    policyID: 'eur',
    state: STATE.SETUP,
    created: '2026-01-01T00:00:00.000Z',
    country: SBO_CONST.COUNTRY.DE,
    currency: CURRENCY.EUR,
});
const EUR_CONNECTED = accountWith({
    ...EUR_CREATED.achData,
    state: STATE.OPEN,
});

function workspaceRef(policyID: string): AccountRef {
    return {policyID, bankAccountID: undefined};
}

type EntryCase = {
    ref?: AccountRef;
    account?: OnboardingAccount;

    /** Null while the workspaces have not arrived */
    workspaces?: Workspaces | null;
    isOffline?: boolean;
    isChangingBankAccount?: boolean;
    hasReadFailed?: boolean;
};

function getState({ref = workspaceRef('usd'), account, workspaces = WORKSPACES, isOffline = false, isChangingBankAccount = false, hasReadFailed = false}: EntryCase): EntryState {
    return getEntryState({
        ref,
        account,
        workspaces: workspaces ?? undefined,
        draft: undefined,
        isOffline,
        isChangingBankAccount,
        hasReadFailed,
    });
}

describe('getEntryState', () => {
    test.each<[string, EntryCase, EntryState]>([
        ['offline before the account of the page arrived', {isOffline: true, account: newAccount('eur')}, {kind: 'offline'}],
        ['loading before the workspaces arrived', {workspaces: null, account: USD_IN_SETUP}, {kind: 'loading'}],
        ['not found when the URL names neither a workspace nor a bank account', {ref: {policyID: undefined, bankAccountID: undefined}}, {kind: 'notFound', isWorkspaceFound: false}],
        ['loading while the account key still holds the account of another workspace', {account: newAccount('eur')}, {kind: 'loading'}],
        ['not found when the read of the account failed', {account: newAccount('eur'), hasReadFailed: true}, {kind: 'notFound', isWorkspaceFound: false}],
        ['not found for a workspace the user does not administer', {ref: workspaceRef('member'), account: newAccount('member')}, {kind: 'notFound', isWorkspaceFound: true}],
        ['not found for a workspace that does not exist', {ref: workspaceRef('missing'), account: newAccount('missing')}, {kind: 'notFound', isWorkspaceFound: false}],
        ['throttled when the server throttles the account', {account: {...USD_IN_SETUP, throttledDate: '2026-01-01 00:00:00'}}, {kind: 'throttled'}],
        ['unsupported for a workspace currency the flow does not handle', {ref: workspaceRef('gbp'), account: newAccount('gbp')}, {kind: 'unsupportedCurrency'}],
        ['connected for a USD account on the last step', {account: USD_CONNECTED}, {kind: 'connected', isNonUSD: false}],
        ['connected for an opened NonUSD account', {ref: workspaceRef('eur'), account: EUR_CONNECTED}, {kind: 'connected', isNonUSD: true}],
        ['a new setup while a connected account is being replaced', {account: USD_CONNECTED, isChangingBankAccount: true}, {kind: 'newSetup', isNonUSD: false, currency: CURRENCY.USD}],
        ['pending validation for a USD account that waits for the test deposits', {account: USD_PENDING}, {kind: 'pendingValidation'}],
        [
            'the setup options for a pending account opened by its bank account ID alone, because validation needs the workspace',
            {
                ref: {policyID: undefined, bankAccountID: BANK_ACCOUNT_ID},
                account: USD_PENDING,
            },
            {kind: 'resumeSetup', isNonUSD: false},
        ],
        ['resume for a USD setup in progress', {account: USD_IN_SETUP}, {kind: 'resumeSetup', isNonUSD: false}],
        ['resume for a created NonUSD account', {ref: workspaceRef('eur'), account: EUR_CREATED}, {kind: 'resumeSetup', isNonUSD: true}],
        ['a new USD setup without an account', {account: newAccount('usd')}, {kind: 'newSetup', isNonUSD: false, currency: CURRENCY.USD}],
        ['a new EUR setup without an account', {ref: workspaceRef('eur'), account: newAccount('eur')}, {kind: 'newSetup', isNonUSD: true, currency: CURRENCY.EUR}],
        ['the account state even offline once the account of the page is loaded', {account: USD_IN_SETUP, isOffline: true}, {kind: 'resumeSetup', isNonUSD: false}],
    ])('shows %s', (_, entryCase, expectedState) => {
        // Given the data that the entry page renders with
        // When the entry state is derived from it
        const state = getState(entryCase);

        // Then the page shows the blockers first, then the account states, then the setup options
        expect(state).toEqual(expectedState);
    });

    describe('start over', () => {
        it('offers a new setup while the reset waits for the server, because the account is cleared before the answer', () => {
            // Given the store after the optimistic data of a reset, whose null merge removed the account data and marked it as pending delete
            const account: OnboardingAccount = {
                pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE,
            };

            // When the entry state is derived, with no account that names the workspace
            const state = getState({account});

            // Then the page counts the cleared account as loaded and offers a new setup instead of a loader
            expect(state).toEqual({
                kind: 'newSetup',
                isNonUSD: false,
                currency: CURRENCY.USD,
            });
        });

        it('offers a new setup after the server accepted the reset', () => {
            // Given the default account that the success data of a reset stores for the workspace
            const account: OnboardingAccount = {
                ...DEFAULT_ACCOUNT,
                achData: {...DEFAULT_ACCOUNT.achData, policyID: 'eur'},
            };

            // When the entry state is derived
            const state = getState({ref: workspaceRef('eur'), account});

            // Then the default account has no bank account, so the page offers a new setup
            expect(state).toEqual({
                kind: 'newSetup',
                isNonUSD: true,
                currency: CURRENCY.EUR,
            });
        });

        it('waits for the read after the server rejected the reset, because the account data is not restored', () => {
            // Given the store after the failure data of a reset: the pending action is gone and the account data stays removed
            const account: OnboardingAccount = {pendingAction: null};

            // When the entry state is derived
            const state = getState({account});

            // Then the page does not offer a new setup over an account that still exists, it waits for the read that restores it
            expect(state).toEqual({kind: 'loading'});
        });
    });

    describe('getAccountRef', () => {
        test.each<[string, string | undefined, string | undefined, ACHData | undefined, AccountRef]>([
            ['keeps the workspace of the URL', 'eur', undefined, undefined, {policyID: 'eur', bankAccountID: undefined}],
            ['keeps both IDs when the URL names both', 'eur', '7', undefined, {policyID: 'eur', bankAccountID: 7}],
            ['finds the workspace of a bank account in the workspace summaries', undefined, String(BANK_ACCOUNT_ID), undefined, {policyID: 'usd', bankAccountID: BANK_ACCOUNT_ID}],
            ['finds the workspace of a bank account in the account data', undefined, '2002', {policyID: 'eur', bankAccountID: 2002}, {policyID: 'eur', bankAccountID: 2002}],
            ['finds no workspace for an unknown bank account', undefined, '3003', undefined, {policyID: undefined, bankAccountID: 3003}],
        ])('%s', (_, policyIDParam, bankAccountIDParam, achData, expectedRef) => {
            // Given the IDs of the URL, the workspace summaries and the account data
            // When they become one reference
            const ref = getAccountRef(policyIDParam, bankAccountIDParam, WORKSPACES, achData);

            // Then the page knows both the workspace and the bank account whenever the data can tell
            expect(ref).toEqual(expectedRef);
        });

        test.each<[string, ACHData | undefined, AccountRef, boolean]>([
            ['matches the same bank account', {policyID: 'usd', bankAccountID: BANK_ACCOUNT_ID}, {policyID: 'usd', bankAccountID: BANK_ACCOUNT_ID}, true],
            ['rejects another bank account of the same workspace', {policyID: 'usd', bankAccountID: 2002}, {policyID: 'usd', bankAccountID: BANK_ACCOUNT_ID}, false],
            ['matches an account without a bank account by its workspace', {policyID: 'usd'}, {policyID: 'usd', bankAccountID: BANK_ACCOUNT_ID}, true],
            ['rejects the account of another workspace', {policyID: 'eur'}, workspaceRef('usd'), false],
            ['rejects missing account data', undefined, workspaceRef('usd'), false],
        ])('isAccountOfRef %s', (_, achData, ref, expected) => {
            // Given the account key, which every workspace shares, and the reference of the page
            // When the page asks whether the key describes its account
            const isOfRef = isAccountOfRef(achData, ref);

            // Then only an account of the same bank account, or of the same workspace when it has none, counts
            expect(isOfRef).toBe(expected);
        });

        test.each<[string, AccountRef, boolean]>([
            ['a workspace', workspaceRef('usd'), true],
            ['a bank account', {policyID: undefined, bankAccountID: BANK_ACCOUNT_ID}, true],
            ['nothing', {policyID: undefined, bankAccountID: undefined}, false],
        ])('hasAccountRef is true only for a reference that names something: %s', (_, ref, expected) => {
            // Given a reference
            // When the page checks whether the URL named an account
            const hasRef = hasAccountRef(ref);

            // Then a reference without IDs has nothing to look up
            expect(hasRef).toBe(expected);
        });
    });
});
