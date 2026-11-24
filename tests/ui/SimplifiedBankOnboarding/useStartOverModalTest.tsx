import {act, renderHook} from '@testing-library/react-native';

import Navigation from '@libs/Navigation/Navigation';

import type {OnboardingAccount, Workspaces} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {getFlowRoute} from '@pages/SimplifiedBankOnboarding/core/flow/flowRoutes';
import {resetBankAccount} from '@pages/SimplifiedBankOnboarding/entry/requests/resetBankAccount';
import useStartOverModal from '@pages/SimplifiedBankOnboarding/entry/reset/useStartOverModal';
import type {StartOverModalOptions} from '@pages/SimplifiedBankOnboarding/entry/reset/useStartOverModal';

import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

import Onyx from 'react-native-onyx';

import type * as MockUseConfirmModalUtil from '../../utils/mockUseConfirmModal';

import {getShowConfirmModalOption, MockModalActions, mockShowConfirmModal, resetMockConfirmModal, resolveShowConfirmModal} from '../../utils/mockUseConfirmModal';
import waitForBatchedUpdates from '../../utils/waitForBatchedUpdates';
import waitForBatchedUpdatesWithAct from '../../utils/waitForBatchedUpdatesWithAct';

jest.mock('@hooks/useConfirmModal', () => {
    const {default: mockUseConfirmModal} = jest.requireActual<typeof MockUseConfirmModalUtil>('../../utils/mockUseConfirmModal');
    return mockUseConfirmModal;
});

jest.mock('@components/Modal/Global/ModalContext', () => {
    const {createMockModalContextModule} = jest.requireActual<typeof MockUseConfirmModalUtil>('../../utils/mockUseConfirmModal');
    return createMockModalContextModule();
});

jest.mock('@hooks/useLocalize', () => jest.fn(() => ({translate: (key: string) => key})));

jest.mock('@libs/Navigation/Navigation', () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    dismissModal: jest.fn(),
}));

// The request itself is covered by the request layer, so this test only checks what the modal sends.
jest.mock('@pages/SimplifiedBankOnboarding/entry/requests/resetBankAccount', () => ({
    resetBankAccount: jest.fn(() => Promise.resolve()),
}));

const POLICY_ID = '1';
const BANK_ACCOUNT_ID = 7;
const WORKSPACE_BANK_ACCOUNT_ID = 9;
const PAYMENTS_ROUTE = ROUTES.SETTINGS_BANK_ONBOARDING_LAB_WORKSPACE_PAYMENTS.getRoute(POLICY_ID);

const UNFINISHED_ACCOUNT: OnboardingAccount = {
    achData: {
        policyID: POLICY_ID,
        bankAccountID: BANK_ACCOUNT_ID,
        state: SBO_CONST.STATE.SETUP,
        currentStep: SBO_CONST.USD.STEP.REQUESTOR,
    },
};
const CONNECTED_ACCOUNT: OnboardingAccount = {
    achData: {
        policyID: POLICY_ID,
        bankAccountID: BANK_ACCOUNT_ID,
        state: SBO_CONST.STATE.OPEN,
        currentStep: SBO_CONST.USD.STEP.ENABLE,
        bankName: 'Platypus Bank',
        accountNumber: '1111222233334444',
    },
};
const WORKSPACES: Workspaces = {
    [POLICY_ID]: {
        id: POLICY_ID,
        name: 'Workspace',
        outputCurrency: SBO_CONST.CURRENCY.USD,
        role: SBO_CONST.WORKSPACE_ROLE.ADMIN,
        achAccount: {
            bankAccountID: WORKSPACE_BANK_ACCOUNT_ID,
            state: SBO_CONST.STATE.SETUP,
        },
    },
};

async function renderStartOverModal(account: OnboardingAccount, options: Partial<StartOverModalOptions> = {}) {
    await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, account);
    await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES, WORKSPACES);
    const rendered = renderHook(() => useStartOverModal({isNonUSD: false, backTo: PAYMENTS_ROUTE, ...options}));
    await waitForBatchedUpdatesWithAct();
    return rendered;
}

async function answerModal(action: (typeof MockModalActions)[keyof typeof MockModalActions]) {
    await act(async () => {
        resolveShowConfirmModal({action});
        await waitForBatchedUpdates();
    });
}

describe('useStartOverModal', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        resetMockConfirmModal();
        jest.clearAllMocks();
        await Onyx.clear();
        await waitForBatchedUpdates();
    });

    it('asks to start over an unfinished setup and resets it on confirm', async () => {
        // Given an unfinished USD setup
        const {result} = await renderStartOverModal(UNFINISHED_ACCOUNT);

        // When the user opens the modal and confirms
        act(() => result.current.openStartOverModal());
        expect(getShowConfirmModalOption('confirmText')).toBe('workspace.bankAccount.yesStartOver');
        expect(getShowConfirmModalOption('prompt')).toBe('workspace.bankAccount.clearProgress');
        await answerModal(MockModalActions.CONFIRM);

        // Then the USD reset runs for the account of the workspace, and the user stays on the entry because it did not come from the lab
        expect(resetBankAccount).toHaveBeenCalledWith({
            isNonUSD: false,
            bankAccount: {policyID: POLICY_ID, bankAccountID: BANK_ACCOUNT_ID},
            workspaceACHAccount: WORKSPACES[POLICY_ID].achAccount,
        });
        expect(Navigation.navigate).not.toHaveBeenCalled();
        expect(Navigation.goBack).not.toHaveBeenCalled();
    });

    it('asks to disconnect a connected account', async () => {
        // Given a connected bank account
        const {result} = await renderStartOverModal(CONNECTED_ACCOUNT);

        // When the user opens the modal
        act(() => result.current.openStartOverModal());

        // Then the modal names the disconnection instead of the lost progress
        expect(getShowConfirmModalOption('confirmText')).toBe('workspace.bankAccount.yesDisconnectMyBankAccount');
        expect(typeof getShowConfirmModalOption('prompt')).not.toBe('string');
    });

    it('does nothing when the user cancels', async () => {
        // Given an open modal
        const {result} = await renderStartOverModal(UNFINISHED_ACCOUNT);
        act(() => result.current.openStartOverModal());

        // When the user cancels it
        await answerModal(MockModalActions.CLOSE);

        // Then no reset is sent and the user stays where they are
        expect(resetBankAccount).not.toHaveBeenCalled();
        expect(Navigation.navigate).not.toHaveBeenCalled();
    });

    it('never stacks a second modal on an open one', async () => {
        // Given an open modal
        const {result} = await renderStartOverModal(UNFINISHED_ACCOUNT);
        act(() => result.current.openStartOverModal());

        // When the row is pressed again before the answer, and once more after it
        act(() => result.current.openStartOverModal());
        expect(mockShowConfirmModal).toHaveBeenCalledTimes(1);
        await answerModal(MockModalActions.CLOSE);
        act(() => result.current.openStartOverModal());

        // Then only the press after the answer opens a new modal
        expect(mockShowConfirmModal).toHaveBeenCalledTimes(2);
    });

    it('opens the NonUSD country page after a NonUSD reset and returns to the lab when the setup came from it', async () => {
        // Given a NonUSD setup opened from the bank account list of the lab
        const {result} = await renderStartOverModal(UNFINISHED_ACCOUNT, {
            isNonUSD: true,
            backTo: ROUTES.SETTINGS_BANK_ONBOARDING_LAB,
        });

        // When the user confirms the reset
        act(() => result.current.openStartOverModal());
        await answerModal(MockModalActions.CONFIRM);

        // Then the NonUSD reset runs, the country page of the NonUSD flow opens, and the user goes back to the lab whose row the reset removed
        expect(resetBankAccount).toHaveBeenCalledWith(expect.objectContaining({isNonUSD: true}));
        expect(Navigation.navigate).toHaveBeenCalledWith(
            getFlowRoute(
                {
                    kind: 'nonUSD',
                    policyID: POLICY_ID,
                    backTo: ROUTES.SETTINGS_BANK_ONBOARDING_LAB,
                },
                {step: SBO_CONST.NON_USD.PAGE_NAMES.COUNTRY},
            ),
            undefined,
        );
        expect(Navigation.goBack).toHaveBeenCalledWith(ROUTES.SETTINGS_BANK_ONBOARDING_LAB);
    });

    it('takes the bank account ID from the workspace summary when the account data has none', async () => {
        // Given account data that names the workspace but has lost its bank account ID
        const {result} = await renderStartOverModal({
            achData: {policyID: POLICY_ID, state: SBO_CONST.STATE.SETUP},
        });

        // When the user confirms the reset
        act(() => result.current.openStartOverModal());
        await answerModal(MockModalActions.CONFIRM);

        // Then the reset still names the bank account that the workspace summary knows
        expect(resetBankAccount).toHaveBeenCalledWith(
            expect.objectContaining({
                bankAccount: {
                    policyID: POLICY_ID,
                    bankAccountID: WORKSPACE_BANK_ACCOUNT_ID,
                },
            }),
        );
    });

    it('applies the answer after the screen that opened the modal is gone', async () => {
        // Given an open modal whose screen unmounts before the user answers
        const {result, unmount} = await renderStartOverModal(UNFINISHED_ACCOUNT);
        act(() => result.current.openStartOverModal());
        unmount();

        // When the user confirms
        await answerModal(MockModalActions.CONFIRM);

        // Then the reset still runs, because the answer must not be lost (BC-17)
        expect(resetBankAccount).toHaveBeenCalledTimes(1);
    });
});
