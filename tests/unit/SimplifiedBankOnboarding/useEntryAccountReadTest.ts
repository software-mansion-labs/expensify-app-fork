import {act, renderHook} from '@testing-library/react-native';

import useNetwork from '@hooks/useNetwork';

import {DEFAULT_ACCOUNT, getNewAccountForPolicy} from '@pages/SimplifiedBankOnboarding/contract/defaultAccount';
import type {OnboardingAccount} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import openOnboardingPage from '@pages/SimplifiedBankOnboarding/core/accountRead/openOnboardingPage';
import useEntryAccountRead from '@pages/SimplifiedBankOnboarding/entry/useEntryAccountRead';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import {useIsFocused} from '@react-navigation/native';
import Onyx from 'react-native-onyx';

import {createDeferredOutcome, settle, TEST_POLICY_ID} from '../../utils/BankOnboardingLabTestUtils';
import waitForBatchedUpdates from '../../utils/waitForBatchedUpdates';
import waitForBatchedUpdatesWithAct from '../../utils/waitForBatchedUpdatesWithAct';

jest.mock('@pages/SimplifiedBankOnboarding/core/accountRead/openOnboardingPage', () => ({
    __esModule: true,
    default: jest.fn(() => Promise.resolve({status: 'succeeded'})),
    getAccountLoadingData: jest.fn(() => ({})),
}));
jest.mock('@hooks/useNetwork', () => jest.fn(() => ({isOffline: false})));
jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<Record<string, unknown>>('@react-navigation/native'),
    useIsFocused: jest.fn(() => true),
}));

const OTHER_POLICY_ID = '2';

const CONNECTED_ACCOUNT: OnboardingAccount = {
    achData: {
        policyID: TEST_POLICY_ID,
        bankAccountID: 5,
        state: SBO_CONST.STATE.OPEN,
        currentStep: SBO_CONST.USD.STEP.ENABLE,
    },
};

function renderEntryRead(isChangingBankAccount = false) {
    return renderHook(() => useEntryAccountRead({policyID: TEST_POLICY_ID, bankAccountID: undefined, isChangingBankAccount}));
}

/** Calls the reconnect handler that the hook gave to useNetwork in its last render */
async function reconnect() {
    const lastCall = jest.mocked(useNetwork).mock.calls.at(-1);
    await act(async () => {
        lastCall?.[0]?.onReconnect?.();
        await waitForBatchedUpdates();
    });
}

describe('useEntryAccountRead', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.mocked(openOnboardingPage).mockClear();
        jest.mocked(useNetwork).mockClear();
        jest.mocked(useIsFocused).mockReturnValue(true);
        await Onyx.clear();
        await waitForBatchedUpdates();
    });

    it('reads the account of the page when the shared key holds another workspace', async () => {
        // Given an account and a draft left behind by the setup of another workspace
        await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {achData: {policyID: OTHER_POLICY_ID, bankAccountID: 9}});
        await Onyx.set(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT, {country: 'US'});

        // When the entry of this workspace opens
        renderEntryRead();
        await waitForBatchedUpdatesWithAct();

        // Then it shows the loader, drops the draft of the other setup and reads this workspace without its server step
        expect(openOnboardingPage).toHaveBeenCalledTimes(1);
        expect(openOnboardingPage).toHaveBeenCalledWith({policyID: TEST_POLICY_ID, stepToOpen: '', subStep: '', localCurrentStep: ''});
        const account = await Onyx.get(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
        expect(account?.isLoading).toBe(true);
        expect(await Onyx.get(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT)).toEqual({});
    });

    it('keeps the status of the newest read when an older read answers last', async () => {
        // Given a read started on open that has not answered yet
        const openRead = createDeferredOutcome();
        const reconnectRead = createDeferredOutcome();
        jest.mocked(openOnboardingPage).mockReturnValueOnce(openRead.promise).mockReturnValueOnce(reconnectRead.promise);
        await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {achData: {policyID: OTHER_POLICY_ID}});
        const {result} = renderEntryRead();
        await waitForBatchedUpdatesWithAct();
        expect(result.current.isReadPending).toBe(true);

        // When the network comes back, the read of the reconnect succeeds, and then the read of the open fails
        await reconnect();
        await settle(reconnectRead, {status: 'succeeded'});
        await settle(openRead, {status: 'failed'});

        // Then the page keeps the success of the newest read, because the older answer describes an outdated request
        expect(openOnboardingPage).toHaveBeenCalledTimes(2);
        expect(result.current).toMatchObject({isReadPending: false, hasReadFailed: false});
    });

    it('reads nothing after a reconnect while a reset of the account is running', async () => {
        // Given an account of this workspace whose reset waits for its answer
        await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {...CONNECTED_ACCOUNT, pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE});
        renderEntryRead();
        await waitForBatchedUpdatesWithAct();

        // When the network comes back
        await reconnect();

        // Then nothing is read, because the answer would land after the error of a failed reset and wipe it
        expect(openOnboardingPage).not.toHaveBeenCalled();
    });

    it('reads the account again when the focus returns after an abandoned bank account change', async () => {
        // Given the entry that shows the connected account of this workspace
        await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, CONNECTED_ACCOUNT);
        const {rerender} = renderEntryRead();
        await waitForBatchedUpdatesWithAct();
        expect(openOnboardingPage).not.toHaveBeenCalled();

        // When a bank account change covers the entry, replaces the shared account with a new setup, and the user backs out of it
        jest.mocked(useIsFocused).mockReturnValue(false);
        rerender({});
        await act(() => Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, getNewAccountForPolicy(TEST_POLICY_ID)));
        jest.mocked(useIsFocused).mockReturnValue(true);
        rerender({});
        await waitForBatchedUpdatesWithAct();

        // Then the entry reads the account again, so the connected account it was showing comes back
        expect(openOnboardingPage).toHaveBeenCalledTimes(1);
        expect(openOnboardingPage).toHaveBeenCalledWith(expect.objectContaining({policyID: TEST_POLICY_ID}));
    });

    it('clears the draft and the account when the entry closes', async () => {
        // Given the entry of a workspace with a draft
        await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, CONNECTED_ACCOUNT);
        await Onyx.set(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT, {country: 'US'});
        const {unmount} = renderEntryRead();
        await waitForBatchedUpdatesWithAct();

        // When the entry closes
        unmount();
        await waitForBatchedUpdates();

        // Then the next workspace never sees this data
        expect(await Onyx.get(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT)).toEqual({});
        expect((await Onyx.get(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT))?.achData).toEqual(DEFAULT_ACCOUNT.achData);
    });

    it('keeps the account on close while the redirect to the validation step needs it', async () => {
        // Given the entry of a pending account that redirected to the validation step
        await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, CONNECTED_ACCOUNT);
        const {result, unmount} = renderEntryRead();
        await waitForBatchedUpdatesWithAct();
        result.current.keepAccountOnUnmount();

        // When the entry closes
        unmount();
        await waitForBatchedUpdates();

        // Then the account stays, because the validation step reads it and fetches nothing
        expect(await Onyx.get(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT)).toEqual(CONNECTED_ACCOUNT);
    });

    it('clears nothing when the instance that changes the bank account closes', async () => {
        // Given the second instance of the entry, opened over the entry that shows the connected account
        await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, CONNECTED_ACCOUNT);
        await Onyx.set(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT, {country: 'US'});
        const {unmount} = renderEntryRead(true);
        await waitForBatchedUpdatesWithAct();

        // When that instance closes
        unmount();
        await waitForBatchedUpdates();

        // Then the data stays, because the entry under it still shows it
        expect(await Onyx.get(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT)).toEqual({country: 'US'});
        expect(await Onyx.get(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT)).toEqual(CONNECTED_ACCOUNT);
    });
});
