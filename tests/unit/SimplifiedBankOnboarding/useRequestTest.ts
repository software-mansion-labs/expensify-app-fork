import {act, renderHook} from '@testing-library/react-native';

import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/contract/REQUEST_NAMES';
import runRequest from '@pages/SimplifiedBankOnboarding/core/requests/runRequest';
import useRequest from '@pages/SimplifiedBankOnboarding/core/requests/useRequest';
import getValidateBankAccountRequest from '@pages/SimplifiedBankOnboarding/flows/usd/validation/getValidateBankAccountRequest';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {write} from '@pages/SimplifiedBankOnboarding/mockBackend/mockApi';

import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

import answerBankOnboardingRequests from '../../utils/answerBankOnboardingRequests';
import waitForBatchedUpdatesWithAct from '../../utils/waitForBatchedUpdatesWithAct';

jest.mock('@pages/SimplifiedBankOnboarding/mockBackend/mockApi', () => ({read: jest.fn(), write: jest.fn()}));

const BANK_ACCOUNT: BankAccountParams = {policyID: 'policy', bankAccountID: 1};
const AMOUNTS = ['1.01', '1.02', '1.03'];

async function renderValidateRequest() {
    const rendered = renderHook(() => useRequest(getValidateBankAccountRequest(BANK_ACCOUNT)));
    await waitForBatchedUpdatesWithAct();
    return rendered;
}

describe('useRequest', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.mocked(write).mockReset();
        await Onyx.clear();
        await waitForBatchedUpdatesWithAct();
    });

    // A write that never got its answer stops listening, and leaves the guard, once its status entry is gone
    afterAll(() => Onyx.clear());

    it('sends the input of the page with the request', async () => {
        // Given a server that accepts the amounts
        answerBankOnboardingRequests('write', 'success');
        const {result} = await renderValidateRequest();

        // When the page sends the amounts that the user typed
        await act(() => result.current.send(AMOUNTS));

        // Then the server gets them as one code, and the page shows neither a loader nor an error
        expect(write).toHaveBeenCalledWith(WRITE_COMMANDS.VALIDATE_BANK_ACCOUNT, {...BANK_ACCOUNT, validateCode: AMOUNTS.join(',')}, expect.anything());
        expect(result.current.isPending).toBe(false);
        expect(result.current.errorMessage).toBeUndefined();
    });

    it('shows the request as pending until the server answers', async () => {
        // Given a server that has not answered yet
        answerBankOnboardingRequests('write', 'none');
        const {result} = await renderValidateRequest();

        // When the page sends the request
        act(() => {
            result.current.send(AMOUNTS);
        });
        await waitForBatchedUpdatesWithAct();

        // Then the page shows a loader, so the user knows that the press did something
        expect(result.current.isPending).toBe(true);
        expect(result.current.errorMessage).toBeUndefined();
    });

    it('shows the error of a failed request', async () => {
        // Given a server that rejects the amounts
        answerBankOnboardingRequests('write', 'failure');
        const {result} = await renderValidateRequest();

        // When the page sends them
        await act(() => result.current.send(AMOUNTS));
        await waitForBatchedUpdatesWithAct();

        // Then the page stops the loader and shows why, so the user can type the amounts again
        expect(result.current.isPending).toBe(false);
        expect(result.current.errorMessage).toEqual(expect.any(String));
    });

    it('sends a write once when the page presses twice before the answer', async () => {
        // Given a server that has not answered yet
        answerBankOnboardingRequests('write', 'none');
        const {result} = await renderValidateRequest();

        // When the page sends the request twice in a row, like a double press
        let secondOutcome;
        await act(async () => {
            result.current.send(AMOUNTS);
            secondOutcome = await result.current.send(AMOUNTS);
        });

        // Then the server gets one call, because a second one could count as a second wrong attempt
        expect(secondOutcome).toEqual({status: 'skipped'});
        expect(write).toHaveBeenCalledTimes(1);
    });

    it('sends nothing from the page while the controller sends the same write', async () => {
        // Given the same write sent outside the page, the way the controller sends a step request, and not answered yet
        answerBankOnboardingRequests('write', 'none');
        runRequest({
            name: REQUEST_NAMES.VALIDATE_BANK_ACCOUNT,
            scope: BANK_ACCOUNT,
            type: 'write',
            command: WRITE_COMMANDS.VALIDATE_BANK_ACCOUNT,
            params: {...BANK_ACCOUNT, validateCode: AMOUNTS.join(',')},
        });
        const {result} = await renderValidateRequest();

        // When the page sends it too
        let pageOutcome;
        await act(async () => {
            pageOutcome = await result.current.send(AMOUNTS);
        });

        // Then the guard of the write key holds across both senders, and the page shows the loader of the write in flight
        expect(pageOutcome).toEqual({status: 'skipped'});
        expect(write).toHaveBeenCalledTimes(1);
        expect(result.current.isPending).toBe(true);
    });
});
