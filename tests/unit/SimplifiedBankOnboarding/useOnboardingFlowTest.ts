import {act, renderHook} from '@testing-library/react-native';

import type {FlowDescriptor} from '@pages/SimplifiedBankOnboarding/core/controller/types';
import useOnboardingFlow from '@pages/SimplifiedBankOnboarding/core/controller/useOnboardingFlow';
import type {FlowRoutes} from '@pages/SimplifiedBankOnboarding/core/navigation/flowNavigation';
import createCustomPage from '@pages/SimplifiedBankOnboarding/core/plan/createCustomPage';
import type {FlowPosition} from '@pages/SimplifiedBankOnboarding/core/plan/position/position';
import type {FlowPlan} from '@pages/SimplifiedBankOnboarding/core/plan/types';
import type {RequestOutcome, RequestState} from '@pages/SimplifiedBankOnboarding/core/requests/types';

import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

import Onyx from 'react-native-onyx';

import getOnyxValue from '../../utils/getOnyxValue';
import waitForBatchedUpdatesWithAct from '../../utils/waitForBatchedUpdatesWithAct';

jest.mock('@hooks/useLocalize', () => jest.fn(() => ({translate: (key: string) => key})));
jest.mock('@react-navigation/native', () => ({useIsFocused: () => true}));
jest.mock('@libs/Navigation/Navigation', () => ({navigate: jest.fn(), goBack: jest.fn()}));

const STEP_ID = 'company';
const NAME_PAGE_ID = 'name';
const CONFIRMATION_PAGE_ID = 'confirmation';
const CUSTOM_PAGE_ID = 'deposits';
const CUSTOM_PAGE_REQUEST_KEY = 'validate:policy-1';
const REQUEST_KEY = 'saveCompany:policy-1';
const ERROR_MESSAGE = 'The server rejected the tax ID';

/** Request errors are keyed by the time they happened */
const ERROR_TIME = '1';

/** One step that ends with a confirmation, which is the page that shows the status of the step request */
const plan: FlowPlan = {
    answers: {},
    steps: [
        {
            id: STEP_ID,
            title: 'Company',
            isComplete: false,
            pages: [
                {kind: 'form', id: NAME_PAGE_ID, title: 'Name', isComplete: true, fields: []},
                {kind: 'confirmation', id: CONFIRMATION_PAGE_ID, title: 'Check the answers', isComplete: true},
            ],
            request: {key: REQUEST_KEY, send: jest.fn()},
        },
    ],
};

const flow: FlowDescriptor<undefined> = {
    wrapperID: 'TestFlow',
    formID: ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM,
    saveDraft: () => Promise.resolve(),
    buildPlan: () => plan,
};

const routes: FlowRoutes = {
    getPositionRoute: () => ROUTES.SETTINGS,
    exit: jest.fn(),
};

const confirmationPosition: FlowPosition = {stepID: STEP_ID, pageID: CONFIRMATION_PAGE_ID, isEditing: false};

async function renderConfirmationPage(requestState: RequestState) {
    await Onyx.merge(ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS, {[REQUEST_KEY]: requestState});
    const rendered = renderHook(() =>
        useOnboardingFlow({
            flow,
            routes,
            urlPosition: confirmationPosition,
            policyID: '1',
            dataSource: {data: undefined, readData: () => Promise.resolve(undefined)},
            dataStatus: 'ready',
        }),
    );
    await waitForBatchedUpdatesWithAct();
    return rendered;
}

/** The screen of the test deposits. The controller never renders it in these tests, so it shows nothing. */
function DepositsScreen() {
    return null;
}

async function getRequestState() {
    const requests = await getOnyxValue(ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS);
    return requests?.[REQUEST_KEY];
}

describe('useOnboardingFlow', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        await Onyx.clear();
        await waitForBatchedUpdatesWithAct();
    });

    describe('the error of a failed request', () => {
        const failedState: RequestState = {requestID: 'request-1', status: 'failed', errors: {[ERROR_TIME]: ERROR_MESSAGE}};

        it('shows on the page that sent the request', async () => {
            // Given a step request that failed
            // When the confirmation of the step is shown
            const {result} = await renderConfirmationPage(failedState);

            // Then the page shows the error, so the user knows why the flow did not move on
            expect(result.current.errorText).toBe(ERROR_MESSAGE);
        });

        it('is dropped when the user opens a page to correct an answer', async () => {
            // Given a confirmation that shows the error of a failed step request
            const {result} = await renderConfirmationPage(failedState);

            // When the user opens the page of an answer to correct it
            act(() => result.current.editPage(NAME_PAGE_ID));
            await waitForBatchedUpdatesWithAct();

            // Then the error is gone, because it described the answers that the user is about to change
            expect(await getRequestState()).toBeUndefined();
            expect(result.current.errorText).toBe('');
        });

        it('is dropped when the user goes back', async () => {
            // Given a confirmation that shows the error of a failed step request
            const {result} = await renderConfirmationPage(failedState);

            // When the user goes back to the previous page
            act(() => result.current.goBack());
            await waitForBatchedUpdatesWithAct();

            // Then the error is gone, so it does not wait for the user on the next visit of the confirmation
            expect(await getRequestState()).toBeUndefined();
        });
    });

    it('keeps the status of a pending request when the user goes back', async () => {
        // Given a confirmation whose step request still waits for the server
        const pendingState: RequestState = {requestID: 'request-1', status: 'pending'};
        const {result} = await renderConfirmationPage(pendingState);

        // When the user goes back while the request is running
        act(() => result.current.goBack());
        await waitForBatchedUpdatesWithAct();

        // Then the status entry stays, because the handler that sent the request still listens for its outcome
        expect(await getRequestState()).toEqual(pendingState);
    });

    describe('a custom page whose screen sends its own request', () => {
        const sendPageRequest = jest.fn((): Promise<RequestOutcome> => Promise.resolve({status: 'succeeded'}));

        /** A step whose only page is a custom page that gets its request from the plan, like the test deposits */
        async function renderDepositsPage() {
            const customPagePlan: FlowPlan = {
                answers: {},
                steps: [
                    {
                        id: STEP_ID,
                        title: 'Validation',
                        isComplete: false,
                        pages: [createCustomPage(DepositsScreen, {id: CUSTOM_PAGE_ID, isComplete: false}, {request: {key: CUSTOM_PAGE_REQUEST_KEY, send: sendPageRequest}})],
                    },
                ],
            };
            const rendered = renderHook(() =>
                useOnboardingFlow({
                    flow: {...flow, buildPlan: () => customPagePlan},
                    routes,
                    urlPosition: {stepID: STEP_ID, pageID: CUSTOM_PAGE_ID, isEditing: false},
                    policyID: '1',
                    dataSource: {data: undefined, readData: () => Promise.resolve(undefined)},
                    dataStatus: 'ready',
                }),
            );
            await waitForBatchedUpdatesWithAct();
            return rendered;
        }

        beforeEach(() => {
            sendPageRequest.mockClear();
        });

        it('is left to the page', async () => {
            // Given the custom page of the test deposits
            const {result} = await renderDepositsPage();

            // When the page reports that it is done
            act(() => result.current.submitPage({}));
            await waitForBatchedUpdatesWithAct();

            // Then the controller does not send the request again, because only the page has its input and already sent it
            expect(sendPageRequest).not.toHaveBeenCalled();
        });

        it('cannot be submitted offline', async () => {
            // Given the custom page of the test deposits
            // When the controller decides whether the page works offline
            const {result} = await renderDepositsPage();

            // Then it does not, because the controller knows the key of the request that the screen sends
            expect(result.current.canSubmitOffline).toBe(false);
        });

        it('drops the error of its request when the user goes back', async () => {
            // Given the custom page of the test deposits, whose request failed
            await Onyx.merge(ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS, {
                [CUSTOM_PAGE_REQUEST_KEY]: {requestID: 'request-1', status: 'failed', errors: {[ERROR_TIME]: ERROR_MESSAGE}},
            });
            const {result} = await renderDepositsPage();

            // When the user goes back
            act(() => result.current.goBack());
            await waitForBatchedUpdatesWithAct();

            // Then the error is gone, because it belongs to the visit of the page that saw the request fail
            const requests = await getOnyxValue(ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS);
            expect(requests?.[CUSTOM_PAGE_REQUEST_KEY]).toBeUndefined();
        });
    });
});
