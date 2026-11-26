import type {ACHData, OnboardingAccount, Workspaces} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import getEntryState, {areAccountActionsDisabled, getEntryStep, isConnectedAccountOfPage} from '@pages/SimplifiedBankOnboarding/entry/getEntryState';
import type {EntryStateInput} from '@pages/SimplifiedBankOnboarding/entry/getEntryState';

const USD_POLICY_ID = '1';
const EUR_POLICY_ID = '2';
const GBP_POLICY_ID = '3';
const MEMBER_POLICY_ID = '4';
const MISSING_POLICY_ID = '99';
const BANK_ACCOUNT_ID = 7;

const WORKSPACES: Workspaces = {
    [USD_POLICY_ID]: {
        id: USD_POLICY_ID,
        name: 'USD workspace',
        outputCurrency: SBO_CONST.CURRENCY.USD,
        role: SBO_CONST.WORKSPACE_ROLE.ADMIN,
    },
    [EUR_POLICY_ID]: {
        id: EUR_POLICY_ID,
        name: 'EUR workspace',
        outputCurrency: SBO_CONST.CURRENCY.EUR,
        role: SBO_CONST.WORKSPACE_ROLE.ADMIN,
    },
    [GBP_POLICY_ID]: {
        id: GBP_POLICY_ID,
        name: 'GBP workspace',
        outputCurrency: 'GBP',
        role: SBO_CONST.WORKSPACE_ROLE.ADMIN,
    },
    [MEMBER_POLICY_ID]: {
        id: MEMBER_POLICY_ID,
        name: 'Member workspace',
        outputCurrency: SBO_CONST.CURRENCY.USD,
        role: SBO_CONST.WORKSPACE_ROLE.USER,
    },
};

function getAccount(achData: ACHData, account: Partial<OnboardingAccount> = {}): OnboardingAccount {
    return {isLoading: false, errors: null, ...account, achData};
}

function getInput(input: Partial<EntryStateInput>): EntryStateInput {
    return {
        policyID: USD_POLICY_ID,
        bankAccountID: undefined,
        account: getAccount({
            policyID: USD_POLICY_ID,
            state: SBO_CONST.STATE.SETUP,
            currentStep: SBO_CONST.USD.STEP.BANK_ACCOUNT,
        }),
        workspaces: WORKSPACES,
        draft: undefined,
        isOffline: false,
        isChangingBankAccount: false,
        isReadPending: false,
        hasReadFailed: false,
        ...input,
    };
}

const IN_PROGRESS_USD_ACH_DATA: ACHData = {
    policyID: USD_POLICY_ID,
    bankAccountID: BANK_ACCOUNT_ID,
    state: SBO_CONST.STATE.SETUP,
    currentStep: SBO_CONST.USD.STEP.REQUESTOR,
};
const CONNECTED_USD_ACH_DATA: ACHData = {
    policyID: USD_POLICY_ID,
    bankAccountID: BANK_ACCOUNT_ID,
    state: SBO_CONST.STATE.OPEN,
    currentStep: SBO_CONST.USD.STEP.ENABLE,
    accountNumber: '1111222233334444',
};

describe('getEntryState', () => {
    it('blocks the page offline until data of this page is on the device', () => {
        // Given an offline device with no account data and one with the in-progress account of this workspace
        const withoutData = getInput({isOffline: true, account: undefined});
        const withDataOfOtherWorkspace = getInput({
            isOffline: true,
            account: getAccount({
                ...IN_PROGRESS_USD_ACH_DATA,
                policyID: EUR_POLICY_ID,
            }),
        });
        const withDataOfThisWorkspace = getInput({
            isOffline: true,
            account: getAccount(IN_PROGRESS_USD_ACH_DATA),
        });

        // When the entry state is computed
        // Then only the data of this workspace lets the page show something else than the offline view (ENTRY-AND-SHARED-37)
        expect(getEntryState(withoutData)).toEqual({kind: 'offline'});
        expect(getEntryState(withDataOfOtherWorkspace)).toEqual({
            kind: 'offline',
        });
        expect(getEntryState(withDataOfThisWorkspace).kind).toBe('options');
    });

    it('waits for the workspaces before it checks anything about the workspace', () => {
        // Given workspaces that are not loaded yet
        const input = getInput({workspaces: undefined});

        // When the entry state is computed
        // Then the page shows the loader of the workspaces (ENTRY-AND-SHARED-38)
        expect(getEntryState(input)).toEqual({
            kind: 'loading',
            waitsFor: 'workspaces',
        });
    });

    it('waits for the account while it loads, is missing or describes another workspace', () => {
        // Given a pending read, a missing account and an account read for another workspace
        const pendingRead = getInput({isReadPending: true});
        const loadingAccount = getInput({
            account: getAccount(IN_PROGRESS_USD_ACH_DATA, {isLoading: true}),
        });
        const missingAccount = getInput({account: undefined});
        const accountOfOtherWorkspace = getInput({
            account: getAccount({
                ...IN_PROGRESS_USD_ACH_DATA,
                policyID: EUR_POLICY_ID,
            }),
        });

        // When the entry state is computed
        // Then every one shows the account loader, because the shared key does not describe this page yet (ENTRY-AND-SHARED-39)
        for (const input of [pendingRead, loadingAccount, missingAccount, accountOfOtherWorkspace]) {
            expect(getEntryState(input)).toEqual({
                kind: 'loading',
                waitsFor: 'account',
            });
        }
    });

    it('shows not found when the workspace is missing or the user is not its admin', () => {
        // Given a read that failed for a missing workspace, and a loaded account of a workspace where the user is a member
        const missingWorkspace = getInput({
            policyID: MISSING_POLICY_ID,
            account: undefined,
            hasReadFailed: true,
        });
        const memberWorkspace = getInput({
            policyID: MEMBER_POLICY_ID,
            account: getAccount({
                ...IN_PROGRESS_USD_ACH_DATA,
                policyID: MEMBER_POLICY_ID,
            }),
        });

        // When the entry state is computed
        // Then both show the not found view, and only the existing workspace gets the not authorized subtitle (ENTRY-AND-SHARED-40)
        expect(getEntryState(missingWorkspace)).toEqual({
            kind: 'notFound',
            isWorkspaceFound: false,
        });
        expect(getEntryState(memberWorkspace)).toEqual({
            kind: 'notFound',
            isWorkspaceFound: true,
        });
    });

    it('keeps the not authorized subtitle when the read of an existing workspace failed', () => {
        // Given an existing workspace whose account read failed before any data arrived
        const input = getInput({
            policyID: MEMBER_POLICY_ID,
            account: undefined,
            hasReadFailed: true,
        });

        // When the entry state is computed
        // Then the view still tells that the workspace exists, so the user learns why the page is blocked
        expect(getEntryState(input)).toEqual({
            kind: 'notFound',
            isWorkspaceFound: true,
        });
    });

    it('keeps an admin waiting when the account read failed', () => {
        // Given an admin whose account read failed before any data arrived
        const input = getInput({
            account: undefined,
            hasReadFailed: true,
        });

        // When the entry state is computed
        // Then the page keeps loading, because the not authorized text would be wrong for an admin
        expect(getEntryState(input)).toEqual({kind: 'loading', waitsFor: 'account'});
    });

    it('blocks a throttled account and a currency the onboarding does not support', () => {
        // Given a throttled account and a workspace with an unsupported currency
        const throttled = getInput({
            account: getAccount(IN_PROGRESS_USD_ACH_DATA, {
                throttledDate: '2026-11-24',
            }),
        });
        const unsupportedCurrency = getInput({
            policyID: GBP_POLICY_ID,
            account: getAccount({
                ...IN_PROGRESS_USD_ACH_DATA,
                policyID: GBP_POLICY_ID,
            }),
        });

        // When the entry state is computed
        // Then each shows its blocking text (ENTRY-AND-SHARED-41)
        expect(getEntryState(throttled)).toEqual({kind: 'throttled'});
        expect(getEntryState(unsupportedCurrency)).toEqual({
            kind: 'unsupportedCurrency',
        });
    });

    it('shows the connected view by the rule of the currency of the workspace', () => {
        // Given a USD account on its last step and an EUR account that the review opened
        const connectedUSD = getInput({
            account: getAccount(CONNECTED_USD_ACH_DATA),
        });
        const connectedNonUSD = getInput({
            policyID: EUR_POLICY_ID,
            account: getAccount({
                policyID: EUR_POLICY_ID,
                bankAccountID: BANK_ACCOUNT_ID,
                state: SBO_CONST.STATE.OPEN,
                created: '2026-01-01',
            }),
        });

        // When the entry state is computed
        // Then both show the connected view with the flow of their currency (ENTRY-AND-SHARED-42)
        expect(getEntryState(connectedUSD)).toEqual({
            kind: 'connected',
            isNonUSD: false,
        });
        expect(getEntryState(connectedNonUSD)).toEqual({
            kind: 'connected',
            isNonUSD: true,
        });
    });

    it('redirects a USD account that waits for the test deposits', () => {
        // Given a USD account in the pending state
        const input = getInput({
            account: getAccount({
                ...IN_PROGRESS_USD_ACH_DATA,
                state: SBO_CONST.STATE.PENDING,
                currentStep: SBO_CONST.USD.STEP.VALIDATION,
            }),
        });

        // When the entry state is computed
        // Then the page only redirects to the validation step, because there is nothing to pick on it
        expect(getEntryState(input)).toEqual({kind: 'pendingValidation'});
    });

    it('redirects a throttled USD account that waits for the test deposits', () => {
        // Given a pending USD account that used all its validation attempts
        const input = getInput({
            account: getAccount(
                {
                    ...IN_PROGRESS_USD_ACH_DATA,
                    state: SBO_CONST.STATE.PENDING,
                    currentStep: SBO_CONST.USD.STEP.VALIDATION,
                },
                {throttledDate: '2026-11-24'},
            ),
        });

        // When the entry state is computed
        // Then the page still redirects, because the validation step is the one that shows the used up attempts
        expect(getEntryState(input)).toEqual({kind: 'pendingValidation'});
    });

    it('offers to continue only a setup that is in progress for this workspace', () => {
        // Given a new setup and a setup with a bank account on the server
        const newSetup = getInput({
            account: getAccount({
                policyID: USD_POLICY_ID,
                state: SBO_CONST.STATE.SETUP,
                currentStep: SBO_CONST.USD.STEP.BANK_ACCOUNT,
                subStep: '',
            }),
        });
        const inProgressSetup = getInput({
            account: getAccount(IN_PROGRESS_USD_ACH_DATA),
        });

        // When the entry state is computed
        // Then both show the options, and only the setup in progress gets the continue rows (ENTRY-AND-SHARED-43)
        expect(getEntryState(newSetup)).toEqual({
            kind: 'options',
            isNonUSD: false,
            currency: SBO_CONST.CURRENCY.USD,
            canContinue: false,
        });
        expect(getEntryState(inProgressSetup)).toEqual({
            kind: 'options',
            isNonUSD: false,
            currency: SBO_CONST.CURRENCY.USD,
            canContinue: true,
        });
    });

    it('shows the fresh options in the instance that changes the bank account', () => {
        // Given the changing instance while the shared data still describes the connected account, and while it is still loading
        const connected = getInput({
            isChangingBankAccount: true,
            account: getAccount(CONNECTED_USD_ACH_DATA),
        });
        const loading = getInput({
            isChangingBankAccount: true,
            isReadPending: true,
            account: getAccount(CONNECTED_USD_ACH_DATA),
        });

        // When the entry state is computed
        // Then it never shows the connected view, the loader or the continue rows, because it collects a new account
        expect(getEntryState(connected)).toEqual({
            kind: 'options',
            isNonUSD: false,
            currency: SBO_CONST.CURRENCY.USD,
            canContinue: false,
        });
        expect(getEntryState(loading)).toEqual({
            kind: 'options',
            isNonUSD: false,
            currency: SBO_CONST.CURRENCY.USD,
            canContinue: false,
        });
    });

    it('checks the account of the URL bank account ID when the page names no workspace', () => {
        // Given a page opened by the bank account ID, with the data of that account and of another account
        const sameAccount = getInput({
            policyID: undefined,
            bankAccountID: BANK_ACCOUNT_ID,
            account: getAccount({
                ...IN_PROGRESS_USD_ACH_DATA,
                currency: SBO_CONST.CURRENCY.USD,
            }),
        });
        const otherAccount = getInput({
            policyID: undefined,
            bankAccountID: BANK_ACCOUNT_ID + 1,
            isOffline: true,
            account: getAccount(IN_PROGRESS_USD_ACH_DATA),
        });

        // When the entry state is computed
        // Then the matching account is used without a workspace check, and offline the other account blocks the page
        expect(getEntryState(sameAccount)).toEqual({
            kind: 'options',
            isNonUSD: false,
            currency: SBO_CONST.CURRENCY.USD,
            canContinue: true,
        });
        expect(getEntryState(otherAccount)).toEqual({kind: 'offline'});
    });
});

describe('getEntryStep', () => {
    it('counts the server step only after the user confirmed the country', () => {
        // Given an account on the requestor step without and with a confirmed country
        const account = getAccount({currentStep: SBO_CONST.USD.STEP.REQUESTOR});

        // When the entry step is read
        // Then the country step stands first until the draft or the account proves the country was picked
        expect(getEntryStep(account, undefined)).toBe(SBO_CONST.USD.STEP.COUNTRY);
        expect(getEntryStep(account, {country: SBO_CONST.COUNTRY.US})).toBe(SBO_CONST.USD.STEP.REQUESTOR);
        expect(
            getEntryStep(
                getAccount({
                    currentStep: SBO_CONST.USD.STEP.REQUESTOR,
                    accountNumber: '1234',
                }),
                undefined,
            ),
        ).toBe(SBO_CONST.USD.STEP.REQUESTOR);
    });
});

describe('isConnectedAccountOfPage', () => {
    it('counts only a connected account of the workspace of the page', () => {
        // Given a connected USD account of the USD workspace, still on the device when another workspace opens
        const achData = CONNECTED_USD_ACH_DATA;

        // When the rule is checked for its own workspace, another workspace and a page without a workspace ID
        // Then the other workspace does not count it, so the entry never takes its later change for an abandoned bank account change
        expect(isConnectedAccountOfPage(achData, false, USD_POLICY_ID)).toBe(true);
        expect(isConnectedAccountOfPage(achData, false, MEMBER_POLICY_ID)).toBe(false);
        expect(isConnectedAccountOfPage(achData, false, undefined)).toBe(true);
        expect(isConnectedAccountOfPage(IN_PROGRESS_USD_ACH_DATA, false, USD_POLICY_ID)).toBe(false);
    });
});

describe('areAccountActionsDisabled', () => {
    it('disables the rows while a write is pending or an error can still be dismissed', () => {
        // Given a pending account, an account with an error and an account that reached the maximum of attempts
        const errors = {error: 'Something went wrong'};

        // When the rule is checked
        // Then only the pending action and an error the user can still dismiss disable the rows
        expect(areAccountActionsDisabled(getAccount({}, {pendingAction: 'update'}))).toBe(true);
        expect(areAccountActionsDisabled(getAccount({}, {errors}))).toBe(true);
        expect(areAccountActionsDisabled(getAccount({}, {errors, maxAttemptsReached: true}))).toBe(false);
        expect(areAccountActionsDisabled(getAccount({}))).toBe(false);
    });
});
