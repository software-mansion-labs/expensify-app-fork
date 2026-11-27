import {fireEvent, render, screen} from '@testing-library/react-native';

import OnyxListItemProvider from '@components/OnyxListItemProvider';

import useOnyx from '@hooks/useOnyx';

import Navigation from '@libs/Navigation/Navigation';
import createPlatformStackNavigator from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigator';

import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {FlowDescriptor, FlowPosition} from '@pages/SimplifiedBankOnboarding/core';
import {OnboardingFlowPage} from '@pages/SimplifiedBankOnboarding/core';

import ONYXKEYS from '@src/ONYXKEYS';

import {NavigationContainer} from '@react-navigation/native';
import React, {createContext, use} from 'react';
import Onyx from 'react-native-onyx';

import getOnyxValue from '../../utils/getOnyxValue';
import createTestFlow, {LABELS, POLICY_ID, POSITIONS, TEST_ROUTES} from '../../utils/SimplifiedBankOnboarding/createTestFlow';
import waitForBatchedUpdatesWithAct from '../../utils/waitForBatchedUpdatesWithAct';

jest.mock('@hooks/useLocalize', () => jest.fn(() => ({translate: (key: string) => key})));
jest.mock('@libs/Navigation/Navigation', () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    getActiveRoute: jest.fn(() => ''),
    getActiveRouteWithoutParams: jest.fn(() => ''),
    isNavigationReady: jest.fn(() => Promise.resolve()),
}));

const ERROR_MESSAGE = 'The server rejected the tax ID';
const COMPANY_NAME = 'Acme';
const CORRECTED_COMPANY_NAME = 'Acme Holdings';
const COMPANY_TAX_ID = '123456789';
const SCREEN_NAME = 'TestFlow';

type OpenedURL = {
    flow: FlowDescriptor<OnboardingDraft>;
    urlPosition: FlowPosition | undefined;
};

/** The navigation is mocked, so the URL that the screen shows comes from the test instead of the route params */
const OpenedURLContext = createContext<OpenedURL | undefined>(undefined);

const Stack = createPlatformStackNavigator<Record<typeof SCREEN_NAME, undefined>>();

/** The screen of a flow as the real ones build it: the draft is the data of the plan, read again by the handlers */
function TestFlowScreen() {
    const openedURL = use(OpenedURLContext);
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);
    const readDraft = async () => (await Onyx.get(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT)) ?? {};
    if (!openedURL) {
        return null;
    }

    return (
        <OnboardingFlowPage
            flow={openedURL.flow}
            routes={TEST_ROUTES}
            urlPosition={openedURL.urlPosition}
            policyID={POLICY_ID}
            dataSource={{data: draft ?? {}, readData: readDraft}}
            dataStatus="ready"
        />
    );
}

function renderFlowScreen(flow: FlowDescriptor<OnboardingDraft>, urlPosition: FlowPosition | undefined) {
    const renderScreen = (position: FlowPosition | undefined) => (
        <OnyxListItemProvider>
            <OpenedURLContext.Provider value={{flow, urlPosition: position}}>
                <NavigationContainer>
                    <Stack.Navigator>
                        <Stack.Screen
                            name={SCREEN_NAME}
                            component={TestFlowScreen}
                        />
                    </Stack.Navigator>
                </NavigationContainer>
            </OpenedURLContext.Provider>
        </OnyxListItemProvider>
    );
    const rendered = render(renderScreen(urlPosition));

    // A test lands on the URL that the controller navigated to by showing it on the screen
    const openPosition = async (position: FlowPosition) => {
        rendered.rerender(renderScreen(position));
        await waitForBatchedUpdatesWithAct();
    };
    return {openPosition};
}

async function openFlow(urlPosition: FlowPosition | undefined, draft: OnboardingDraft = {}) {
    await Onyx.set(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT, draft);
    const testFlow = createTestFlow();
    const {openPosition} = renderFlowScreen(testFlow.flow, urlPosition);
    await waitForBatchedUpdatesWithAct();
    return {...testFlow, openPosition};
}

async function pressButton(label: string) {
    fireEvent.press(screen.getByText(label));
    await waitForBatchedUpdatesWithAct();
}

const filledCompanyDraft: OnboardingDraft = {companyName: COMPANY_NAME, companyTaxID: COMPANY_TAX_ID};

describe('OnboardingFlowPage', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        await Onyx.clear();
        await waitForBatchedUpdatesWithAct();
    });

    it('saves the answer of a form page and opens the next page on Next', async () => {
        // Given the first page of a step that nobody answered yet
        await openFlow(POSITIONS.COMPANY_NAME);

        // When the user types an answer and presses Next
        fireEvent.changeText(screen.getByLabelText(LABELS.COMPANY_NAME), COMPANY_NAME);
        await pressButton('common.next');

        // Then the answer is in the draft, which is the only store of what the user typed, and the next page of the step opens
        const draft = await getOnyxValue(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);
        expect(draft?.companyName).toBe(COMPANY_NAME);
        expect(Navigation.navigate).toHaveBeenCalledWith(TEST_ROUTES.getPositionRoute(POSITIONS.COMPANY_TAX_ID));
    });

    it('sends the step request from the last page of a step and opens the next step once it succeeds', async () => {
        // Given the confirmation that closes a step whose answers are all filled in
        const {sendCompanyRequest, answerCompanyRequest} = await openFlow(POSITIONS.COMPANY_CONFIRMATION, filledCompanyDraft);

        // When the user confirms the step
        await pressButton('common.confirm');

        // Then the step request is sent and the flow waits for the server, because the next step needs the saved answers
        expect(sendCompanyRequest).toHaveBeenCalledTimes(1);
        expect(Navigation.navigate).not.toHaveBeenCalled();

        // When the server accepts the step
        answerCompanyRequest({status: 'succeeded'});
        await waitForBatchedUpdatesWithAct();

        // Then the first page of the next step opens
        expect(Navigation.navigate).toHaveBeenCalledWith(TEST_ROUTES.getPositionRoute(POSITIONS.OWNER_NAME));
    });

    it('keeps the user on the page and shows the error when the step request fails', async () => {
        // Given the confirmation that closes a step whose answers are all filled in
        const {answerCompanyRequest} = await openFlow(POSITIONS.COMPANY_CONFIRMATION, filledCompanyDraft);

        // When the user confirms the step and the server rejects it
        await pressButton('common.confirm');
        answerCompanyRequest({status: 'failed', errorMessage: ERROR_MESSAGE});
        await waitForBatchedUpdatesWithAct();

        // Then the flow does not move on and the page tells the user why, so they can correct the answer and confirm again
        expect(Navigation.navigate).not.toHaveBeenCalled();
        expect(screen.getByText(ERROR_MESSAGE)).toBeOnTheScreen();
        expect(screen.getByText(LABELS.COMPANY_CONFIRMATION)).toBeOnTheScreen();
    });

    it('opens a page from the confirmation in edit mode and returns to the confirmation after its submit', async () => {
        // Given the confirmation of a step whose answers are all filled in
        const {openPosition} = await openFlow(POSITIONS.COMPANY_CONFIRMATION, filledCompanyDraft);

        // When the user presses the row of the company name
        // The row ignores a press that comes without an event, so the test sends one
        fireEvent.press(screen.getByText(COMPANY_NAME), {nativeEvent: {}});
        await waitForBatchedUpdatesWithAct();

        // Then the page of the company name opens in edit mode, so its submit knows where to return
        expect(Navigation.navigate).toHaveBeenCalledWith(TEST_ROUTES.getPositionRoute(POSITIONS.COMPANY_NAME_EDIT));

        // When the user corrects the name on that page and confirms it
        await openPosition(POSITIONS.COMPANY_NAME_EDIT);
        fireEvent.changeText(screen.getByLabelText(LABELS.COMPANY_NAME), CORRECTED_COMPANY_NAME);
        await pressButton('common.confirm');

        // Then the correction is saved and the user goes back to the confirmation instead of walking through the following pages again
        const draft = await getOnyxValue(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);
        expect(draft?.companyName).toBe(CORRECTED_COMPANY_NAME);
        expect(Navigation.goBack).toHaveBeenCalledWith(TEST_ROUTES.getPositionRoute(POSITIONS.COMPANY_CONFIRMATION));
        expect(Navigation.navigate).not.toHaveBeenCalledWith(TEST_ROUTES.getPositionRoute(POSITIONS.COMPANY_TAX_ID));
    });

    it('resumes at the first page without an answer when the URL names no page', async () => {
        // Given a draft that holds the company name but not the tax ID
        // When the flow opens from a URL without a position, such as the link of the entry page
        await openFlow(undefined, {companyName: COMPANY_NAME});

        // Then the URL is replaced by the page of the tax ID, so the user continues where they stopped
        expect(Navigation.navigate).toHaveBeenCalledTimes(1);
        expect(Navigation.navigate).toHaveBeenCalledWith(TEST_ROUTES.getPositionRoute(POSITIONS.COMPANY_TAX_ID), {forceReplace: true});
    });

    it('redirects a URL of a later step while an earlier step is not complete', async () => {
        // Given a draft without any company answer
        // When a typed or stale URL opens the owner step
        await openFlow(POSITIONS.OWNER_NAME);

        // Then the owner page is not shown and the URL is replaced by the first page without an answer, so no required page is skipped
        expect(screen.queryByText(LABELS.OWNER_NAME)).not.toBeOnTheScreen();
        expect(Navigation.navigate).toHaveBeenCalledTimes(1);
        expect(Navigation.navigate).toHaveBeenCalledWith(TEST_ROUTES.getPositionRoute(POSITIONS.COMPANY_NAME), {forceReplace: true});
    });

    it('sends the step request once when the user presses Confirm twice', async () => {
        // Given the confirmation that closes a step whose answers are all filled in
        const {sendCompanyRequest, answerCompanyRequest} = await openFlow(POSITIONS.COMPANY_CONFIRMATION, filledCompanyDraft);

        // When the user presses Confirm a second time before the page shows that the first press is running
        const confirmButton = screen.getByText('common.confirm');
        fireEvent.press(confirmButton);
        fireEvent.press(confirmButton);
        await waitForBatchedUpdatesWithAct();
        answerCompanyRequest({status: 'succeeded'});
        await waitForBatchedUpdatesWithAct();

        // Then the server gets one request, because a second one would save the step twice
        expect(sendCompanyRequest).toHaveBeenCalledTimes(1);
        expect(Navigation.navigate).toHaveBeenCalledTimes(1);
    });
});
