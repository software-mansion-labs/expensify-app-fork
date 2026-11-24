import {fireEvent, render, screen} from '@testing-library/react-native';

import type InteractiveStepWrapperModule from '@components/InteractiveStepWrapper';
import {PressableWithoutFeedback} from '@components/Pressable';
import Text from '@components/Text';

import Navigation from '@libs/Navigation/Navigation';

import type {PageID, StepID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import {FlowStepPositionContext, OnboardingFlowActionsContext, OnboardingFlowStateContext} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';
import type {FlowStepPosition, FlowTarget, OnboardingFlowActions, OnboardingFlowState} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';
import {getFlowRoute} from '@pages/SimplifiedBankOnboarding/core/flow/flowRoutes';
import type {FlowNavigationState} from '@pages/SimplifiedBankOnboarding/core/flow/flowRoutes';
import OnboardingStep from '@pages/SimplifiedBankOnboarding/core/step/OnboardingStep';
import {usePageNavigation} from '@pages/SimplifiedBankOnboarding/core/step/pageNavigation';
import type {SubPageElementProps} from '@pages/SimplifiedBankOnboarding/core/step/readSubPages';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import SCREENS from '@src/SCREENS';

import type * as NativeNavigation from '@react-navigation/native';
import type ReactNative from 'react-native';

import React from 'react';
import Onyx from 'react-native-onyx';

import getOnyxValue from '../../utils/getOnyxValue';
import waitForBatchedUpdatesWithAct from '../../utils/waitForBatchedUpdatesWithAct';

const ROUTE_KEY = 'current-route';
const SCREEN_NAME = SCREENS.SETTINGS.BANK_ONBOARDING_LAB.USD_SETUP;
const POLICY_ID = '1';
const TARGET: FlowTarget = {kind: 'usd', policyID: POLICY_ID, backTo: undefined};

let mockNavigationState: FlowNavigationState = {routes: []};

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<typeof NativeNavigation>('@react-navigation/native'),
    useIsFocused: () => true,
    useRoute: () => ({key: 'current-route', name: 'CurrentScreen'}),
    useNavigation: () => ({getState: () => mockNavigationState}),
    useNavigationState: <TResult,>(selector: (state: FlowNavigationState) => TResult) => selector(mockNavigationState),
}));

jest.mock('@libs/Navigation/Navigation', () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setParams: jest.fn(),
    dismissModal: jest.fn(),
}));

jest.mock('@hooks/useLocalize', () => jest.fn(() => ({translate: (key: string) => key})));

// The real wrapper needs the whole screen stack. The test keeps its two inputs that the step drives: the content and Back.
jest.mock('@components/InteractiveStepWrapper', () => {
    const RN = jest.requireActual<typeof ReactNative>('react-native');
    return ({children, handleBackButtonPress}: React.ComponentProps<typeof InteractiveStepWrapperModule>) => (
        <RN.View>
            <RN.Pressable
                accessibilityRole="button"
                accessibilityLabel="Back"
                onPress={handleBackButtonPress}
            />
            {children}
        </RN.View>
    );
});

type TestPageProps = SubPageElementProps & {label: string};

/** A sub page with its label and a Next button, so a test sees which page is shown and can move on */
function TestPage({label}: TestPageProps) {
    const {goNext} = usePageNavigation();
    return (
        <>
            <Text>{label}</Text>
            <PressableWithoutFeedback
                accessibilityRole="button"
                accessibilityLabel="Next"
                sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SUBMIT_STEP}
                onPress={() => goNext()}
            />
        </>
    );
}

type RenderOptions = {
    page?: PageID;
    isEditing?: boolean;
    previousStep?: StepID;
    nextStep?: StepID;
    answered?: PageID[];
    startAt?: PageID;
};

const flowActions: OnboardingFlowActions = {
    saveDraft: () => Promise.resolve(),
    returnToEntry: jest.fn(),
    leaveFlow: jest.fn(),
    openStep: jest.fn(),
};

function getStepRoute(step: StepID, page?: PageID, isEditing?: boolean) {
    return getFlowRoute(TARGET, {step, page, isEditing});
}

function createRoute(key: string, step: StepID, page?: PageID) {
    return {key, name: SCREEN_NAME, params: {policyID: POLICY_ID, page: step, subPage: page}};
}

/** The stack with the current route on top. `below` lists the routes under it, the oldest first. */
function setNavigationStack(below: Array<ReturnType<typeof createRoute>>) {
    mockNavigationState = {routes: [...below, createRoute(ROUTE_KEY, 'personal-info')]};
}

function buildPersonalInfoStep(options: RenderOptions = {}) {
    // A spread, not parameter defaults, so a test can pass `undefined` for the first or the last step
    const {page, isEditing = false, previousStep, nextStep, answered = [], startAt}: RenderOptions = {previousStep: 'bank-account', nextStep: 'business-info', ...options};
    const flowState: OnboardingFlowState = {target: TARGET, bankAccount: {policyID: POLICY_ID, bankAccountID: 0}, formID: ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM};
    const position: FlowStepPosition = {step: 'personal-info', previousStep, nextStep, counterIndex: 1, counterNames: ['1', '2', '3'], page, isEditing};

    return (
        <OnboardingFlowStateContext.Provider value={flowState}>
            <OnboardingFlowActionsContext.Provider value={flowActions}>
                <FlowStepPositionContext.Provider value={position}>
                    <OnboardingStep
                        title="Personal info"
                        wrapperID="PersonalInfoTestStep"
                        startAt={startAt}
                    >
                        <TestPage
                            name="full-name"
                            label="Name page"
                            isAnswered={answered.includes('full-name')}
                        />
                        <TestPage
                            name="ssn"
                            label="SSN page"
                            isAnswered={answered.includes('ssn')}
                        />
                        <TestPage
                            name="confirmation"
                            label="Confirmation page"
                            isAnswered={answered.includes('confirmation')}
                        />
                    </OnboardingStep>
                </FlowStepPositionContext.Provider>
            </OnboardingFlowActionsContext.Provider>
        </OnboardingFlowStateContext.Provider>
    );
}

async function renderPersonalInfoStep(options?: RenderOptions) {
    render(buildPersonalInfoStep(options));
    await waitForBatchedUpdatesWithAct();
}

function pressBack() {
    fireEvent.press(screen.getByLabelText('Back'));
}

function pressNext() {
    fireEvent.press(screen.getByLabelText('Next'));
}

describe('OnboardingStep', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        setNavigationStack([]);
        await Onyx.clear();
        await waitForBatchedUpdatesWithAct();
    });

    describe('the start page', () => {
        it('opens the first rendered page after Next even when it is answered', async () => {
            // Given the user pressed Next on the previous step, so its route lies directly under this one
            setNavigationStack([createRoute('previous-route', 'bank-account', 'confirmation')]);

            // When the step opens without a page in the URL and its first page is answered
            await renderPersonalInfoStep({answered: ['full-name']});

            // Then the step starts at its first page, because Next means "continue in order", and the URL gets that page
            expect(screen.getByText('Name page')).toBeOnTheScreen();
            expect(Navigation.setParams).toHaveBeenCalledWith({subPage: 'full-name'}, ROUTE_KEY);
        });

        it('opens startAt on Next', async () => {
            // Given the user pressed Next on the previous step
            setNavigationStack([createRoute('previous-route', 'bank-account')]);

            // When the step names the page it starts at
            await renderPersonalInfoStep({startAt: 'ssn'});

            // Then startAt wins over the first page
            expect(screen.getByText('SSN page')).toBeOnTheScreen();
            expect(Navigation.setParams).toHaveBeenCalledWith({subPage: 'ssn'}, ROUTE_KEY);
        });

        it('opens the first page that is not answered on a resume or a deep link', async () => {
            // Given no route of the previous step under this one, as after a resume or a deep link
            setNavigationStack([]);

            // When the step opens and its first page is answered
            await renderPersonalInfoStep({answered: ['full-name']});

            // Then the user continues where the answers stop
            expect(screen.getByText('SSN page')).toBeOnTheScreen();
            expect(Navigation.setParams).toHaveBeenCalledWith({subPage: 'ssn'}, ROUTE_KEY);
        });

        it('shows the page in the first frame and writes the URL exactly once', async () => {
            // Given a URL without a sub page
            // When the step renders for the first time
            const {rerender} = render(buildPersonalInfoStep());

            // Then the resolved page is on the screen in that first frame, before the URL write lands, so no loader flashes
            expect(screen.getByText('Name page')).toBeOnTheScreen();

            // When the step renders again with the same position
            await waitForBatchedUpdatesWithAct();
            rerender(buildPersonalInfoStep());
            await waitForBatchedUpdatesWithAct();

            // Then the URL write is not repeated per render
            expect(Navigation.setParams).toHaveBeenCalledTimes(1);
            expect(Navigation.setParams).toHaveBeenCalledWith({subPage: 'full-name'}, ROUTE_KEY);
        });

        it('treats a sub page that is not rendered as no sub page', async () => {
            // Given a URL that names a page this step does not render
            // When the step opens
            await renderPersonalInfoStep({page: 'date-of-birth', answered: ['full-name', 'ssn']});

            // Then the start rule picks the page and writes it over the unknown one
            expect(screen.getByText('Confirmation page')).toBeOnTheScreen();
            expect(Navigation.setParams).toHaveBeenCalledWith({subPage: 'confirmation'}, ROUTE_KEY);
        });

        it('does not write the URL when it already names a rendered page', async () => {
            // Given a URL that names a rendered page
            // When the step opens
            await renderPersonalInfoStep({page: 'ssn'});

            // Then the page is shown and the URL stays as it is
            expect(screen.getByText('SSN page')).toBeOnTheScreen();
            expect(Navigation.setParams).not.toHaveBeenCalled();
        });
    });

    describe('Next', () => {
        it('opens the next page and then the next step', async () => {
            // Given the first page of the step
            await renderPersonalInfoStep({page: 'full-name'});

            // When the user presses Next
            pressNext();

            // Then the next page opens as a new route of the same step
            expect(Navigation.navigate).toHaveBeenCalledWith(getStepRoute('personal-info', 'ssn'));
        });

        it('opens the next step from the last page', async () => {
            // Given the last page of the step
            await renderPersonalInfoStep({page: 'confirmation'});

            // When the user presses Next
            pressNext();

            // Then the next step of the flow opens
            expect(Navigation.navigate).toHaveBeenCalledWith(getStepRoute('business-info'));
        });

        it('returns to the entry from the last page of the last step', async () => {
            // Given the last page of the last step
            await renderPersonalInfoStep({page: 'confirmation', nextStep: undefined});

            // When the user presses Next
            pressNext();

            // Then the flow hands control back to the entry
            expect(flowActions.returnToEntry).toHaveBeenCalledTimes(1);
            expect(Navigation.navigate).not.toHaveBeenCalled();
        });
    });

    describe('Back', () => {
        it('opens the previous page', async () => {
            // Given the second page of the step
            await renderPersonalInfoStep({page: 'ssn'});

            // When the user presses Back
            pressBack();

            // Then the previous page of the step opens
            expect(Navigation.goBack).toHaveBeenCalledWith(getStepRoute('personal-info', 'full-name'));
        });

        it('returns to the page the user saw last on the previous step', async () => {
            // Given the user came from the confirmation of the previous step, with an older route of it below
            setNavigationStack([createRoute('older-route', 'bank-account', 'manual'), createRoute('previous-route', 'bank-account', 'confirmation')]);
            await renderPersonalInfoStep({page: 'full-name'});

            // When the user presses Back on the first page
            pressBack();

            // Then the latest route of the previous step opens, so the history is not rebuilt
            expect(Navigation.goBack).toHaveBeenCalledWith(getStepRoute('bank-account', 'confirmation'));
        });

        it('opens the previous step without history', async () => {
            // Given a step that opened by a deep link, with no route of the previous step below
            await renderPersonalInfoStep({page: 'full-name'});

            // When the user presses Back on the first page
            pressBack();

            // Then the previous step opens by its route, which Navigation replaces when it is not in the history
            expect(Navigation.goBack).toHaveBeenCalledWith(getStepRoute('bank-account'));
        });

        it('returns to the entry from the first step', async () => {
            // Given the first page of the first step
            await renderPersonalInfoStep({page: 'full-name', previousStep: undefined});

            // When the user presses Back
            pressBack();

            // Then the flow hands control back to the entry
            expect(flowActions.returnToEntry).toHaveBeenCalledTimes(1);
        });

        it('keeps an account error that no request of the flow wrote', async () => {
            // Given an account error that came from outside the flow, like the error of a failed bank account reset
            const resetError = {failedReset: 'Something failed'};
            await Onyx.merge(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {errors: resetError});
            await renderPersonalInfoStep({page: 'ssn'});

            // When the user presses Back
            pressBack();
            await waitForBatchedUpdatesWithAct();

            // Then the error stays, because Back only removes the mirror of an error that a page of the flow showed
            const account = await getOnyxValue(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
            expect(account?.errors).toEqual(resetError);
        });
    });

    describe('edit mode', () => {
        it('returns to the confirmation on Next with history', async () => {
            // Given the user opened a page from the confirmation, which lies below in the history
            setNavigationStack([createRoute('confirmation-route', 'personal-info', 'confirmation')]);
            await renderPersonalInfoStep({page: 'full-name', isEditing: true});

            // When the user presses Next
            pressNext();

            // Then the confirmation opens again by going back to it
            expect(Navigation.goBack).toHaveBeenCalledWith(getStepRoute('personal-info', 'confirmation'));
            expect(Navigation.navigate).not.toHaveBeenCalled();
        });

        it('returns to the confirmation on Back without history', async () => {
            // Given an edit page that opened by a deep link, with no confirmation in the history
            await renderPersonalInfoStep({page: 'ssn', isEditing: true});

            // When the user presses Back
            pressBack();

            // Then Back also returns to the confirmation instead of the previous page
            expect(Navigation.goBack).toHaveBeenCalledWith(getStepRoute('personal-info', 'confirmation'));
        });
    });
});
