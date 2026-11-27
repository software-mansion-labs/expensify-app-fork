import {act, renderHook} from '@testing-library/react-native';

import {OnboardingFlowActionsContext, OnboardingFlowStateContext} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';
import type {OnboardingFlowActions, OnboardingFlowState} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';
import {clearRequestState} from '@pages/SimplifiedBankOnboarding/core/requests/runRequest';
import type {OnboardingRequest, RequestOutcome} from '@pages/SimplifiedBankOnboarding/core/requests/types';
import useOnboardingRequest, {useBackgroundRequest} from '@pages/SimplifiedBankOnboarding/core/requests/useOnboardingRequest';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {write} from '@pages/SimplifiedBankOnboarding/mockBackend/mockApi';

import ONYXKEYS from '@src/ONYXKEYS';
import type {OnyxData} from '@src/types/onyx/Request';

import type {ReactNode} from 'react';
import type {OnyxKey} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

import getOnyxValue from '../../utils/getOnyxValue';
import waitForBatchedUpdates from '../../utils/waitForBatchedUpdates';
import waitForBatchedUpdatesWithAct from '../../utils/waitForBatchedUpdatesWithAct';

jest.mock('@pages/SimplifiedBankOnboarding/mockBackend/mockApi', () => ({
    read: jest.fn(),
    write: jest.fn(),
}));

type Answer = 'success' | 'failure' | 'none';

const POLICY_ID = '1';
const OTHER_ERROR = {otherRequest: 'An error of another request'};

const FLOW_STATE: OnboardingFlowState = {
    target: {kind: 'usd', policyID: POLICY_ID, backTo: undefined},
    bankAccount: {policyID: POLICY_ID, bankAccountID: 0},
    formID: ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM,
};

const FLOW_ACTIONS: OnboardingFlowActions = {
    saveDraft: () => Promise.resolve(),
    returnToEntry: () => {},
    leaveFlow: () => {},
    openStep: () => {},
};

const CONFIRM_REQUEST: OnboardingRequest = {
    name: 'usd.personalInfo.confirm',
    build: ({bankAccount, draft}) => ({
        type: 'write',
        command: WRITE_COMMANDS.UPDATE_PERSONAL_INFORMATION,
        params: {...bankAccount, firstName: draft.firstName, confirm: true},
    }),
};

const PROGRESS_REQUEST: OnboardingRequest = {
    name: 'usd.personalInfo.saveProgress',
    build: ({bankAccount}) => ({
        type: 'write',
        command: WRITE_COMMANDS.UPDATE_PERSONAL_INFORMATION,
        params: {...bankAccount, confirm: false},
    }),
};

const REQUEST_WITHOUT_WORKSPACE: OnboardingRequest = {
    name: 'nonUSD.bankInfo.confirm',
    build: () => undefined,
};

function FlowWrapper({children}: {children: ReactNode}) {
    return (
        <OnboardingFlowStateContext.Provider value={FLOW_STATE}>
            <OnboardingFlowActionsContext.Provider value={FLOW_ACTIONS}>{children}</OnboardingFlowActionsContext.Provider>
        </OnboardingFlowStateContext.Provider>
    );
}

/** Applies the data of a request the way the mock API does for each kind of answer */
function answerWrites(answer: Answer) {
    jest.mocked(write).mockImplementation((_command, _params, onyxData: OnyxData<OnyxKey> = {}) => {
        Onyx.update(onyxData.optimisticData ?? [])
            .then(() => {
                if (answer === 'none') {
                    return undefined;
                }
                return Onyx.update(answer === 'success' ? (onyxData.successData ?? []) : (onyxData.failureData ?? []));
            })
            .then(() => (answer === 'none' ? undefined : Onyx.update(onyxData.finallyData ?? [])));
    });
}

function renderRequest(request: OnboardingRequest) {
    return renderHook(() => useOnboardingRequest(request), {
        wrapper: FlowWrapper,
    });
}

async function getAccountErrors() {
    return (await getOnyxValue(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT))?.errors;
}

describe('useOnboardingRequest', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.mocked(write).mockReset();
        await clearRequestState();
        await Onyx.clear();
        await waitForBatchedUpdates();
    });

    afterAll(() => clearRequestState());

    it('builds the request from the draft that Onyx holds when it is sent', async () => {
        // Given a draft saved by the page right before the send
        answerWrites('success');
        await Onyx.merge(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT, {
            firstName: 'Alberta',
        });
        const {result} = renderRequest(CONFIRM_REQUEST);

        // When the request is sent
        let outcome: RequestOutcome | undefined;
        await act(async () => {
            outcome = await result.current.send();
        });

        // Then it carries the saved value and the bank account of the flow
        expect(outcome).toEqual({status: 'succeeded'});
        expect(write).toHaveBeenCalledWith(WRITE_COMMANDS.UPDATE_PERSONAL_INFORMATION, {policyID: POLICY_ID, bankAccountID: 0, firstName: 'Alberta', confirm: true}, expect.anything());
    });

    it('sends nothing on a second press while the first request is pending, also within the same tick', async () => {
        // Given a server that has not answered yet
        answerWrites('none');
        const {result} = renderRequest(CONFIRM_REQUEST);

        // When the user presses twice in one tick
        let secondOutcome: RequestOutcome | undefined;
        await act(async () => {
            result.current.send();
            secondOutcome = await result.current.send();
        });
        await waitForBatchedUpdatesWithAct();

        // Then only one request goes out, and the page shows it as pending
        expect(secondOutcome).toEqual({status: 'skipped'});
        expect(write).toHaveBeenCalledTimes(1);
        expect(result.current.isPending).toBe(true);
    });

    it('sends nothing on a later press while the first request still waits for its answer', async () => {
        // Given a first press whose request went out and has no answer yet
        answerWrites('none');
        const {result} = renderRequest(CONFIRM_REQUEST);
        await act(async () => {
            result.current.send();
            await waitForBatchedUpdates();
        });

        // When the user presses again
        let secondOutcome: RequestOutcome | undefined;
        await act(async () => {
            secondOutcome = await result.current.send();
        });

        // Then the second press sends nothing, because the first request is still pending
        expect(secondOutcome).toEqual({status: 'skipped'});
        expect(write).toHaveBeenCalledTimes(1);
    });

    it('sends the progress save of every page, also while an earlier one is pending', async () => {
        // Given a progress save that has no answer yet
        answerWrites('none');
        const {result} = renderHook(() => useBackgroundRequest(PROGRESS_REQUEST), {wrapper: FlowWrapper});

        // When two pages are saved one after the other
        await act(async () => {
            result.current();
            result.current();
            await waitForBatchedUpdates();
        });

        // Then both saves go out, so offline each one waits in the queue
        expect(write).toHaveBeenCalledTimes(2);
    });

    it('records a failed attempt with the generic error for a request that cannot be built', async () => {
        // Given a request that has no workspace to send for
        const {result} = renderRequest(REQUEST_WITHOUT_WORKSPACE);

        // When it is sent
        let outcome: RequestOutcome | undefined;
        await act(async () => {
            outcome = await result.current.send();
        });
        await waitForBatchedUpdatesWithAct();

        // Then nothing goes out, and the page shows an error instead of a button that does nothing
        expect(outcome).toEqual({status: 'failed'});
        expect(write).not.toHaveBeenCalled();
        expect(result.current.errorMessage).toBeTruthy();
    });

    it('clears the error and its account mirror when a new attempt starts', async () => {
        // Given a failed write of the USD flow, which shows its error on the page and on the account
        answerWrites('failure');
        const {result} = renderRequest(CONFIRM_REQUEST);
        await act(async () => {
            await result.current.send();
        });
        await waitForBatchedUpdatesWithAct();
        expect(result.current.errorMessage).toBeTruthy();
        expect(await getAccountErrors()).toBeTruthy();

        // When the user tries again
        answerWrites('none');
        await act(async () => {
            result.current.send();
            await waitForBatchedUpdates();
        });

        // Then neither the page nor the entry shows the old error
        expect(result.current.errorMessage).toBeUndefined();
        expect(await getAccountErrors()).toBeFalsy();
    });

    it('clears the error and its account mirror when the page unmounts', async () => {
        // Given a failed write of the USD flow
        answerWrites('failure');
        const {result, unmount} = renderRequest(CONFIRM_REQUEST);
        await act(async () => {
            await result.current.send();
        });
        await waitForBatchedUpdatesWithAct();
        expect(await getAccountErrors()).toBeTruthy();

        // When the page unmounts
        unmount();
        await waitForBatchedUpdates();

        // Then the entry and the Payments page do not show the error of a page that is gone
        expect(await getAccountErrors()).toBeFalsy();
        expect((await getOnyxValue(ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS))?.byKey).toEqual({});
    });

    it('keeps the account error when it belongs to another request', async () => {
        // Given a failed write, after which another request wrote its own error to the account
        answerWrites('failure');
        const {result, unmount} = renderRequest(CONFIRM_REQUEST);
        await act(async () => {
            await result.current.send();
        });
        await waitForBatchedUpdatesWithAct();
        await Onyx.merge(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {
            errors: null,
        });
        await Onyx.merge(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {
            errors: OTHER_ERROR,
        });

        // When the page that failed unmounts
        unmount();
        await waitForBatchedUpdates();

        // Then the newer error of the other request stays
        expect(await getAccountErrors()).toEqual(OTHER_ERROR);
    });
});
