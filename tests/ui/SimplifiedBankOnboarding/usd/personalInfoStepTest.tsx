import {fireEvent, screen} from '@testing-library/react-native';

import type InteractiveStepWrapperModule from '@components/InteractiveStepWrapper';

import useNetwork from '@hooks/useNetwork';

import Navigation from '@libs/Navigation/Navigation';

import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {PageID, StepID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import type {ACHData} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import type {FlowStepPosition, FlowTarget} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';
import {getFlowRoute} from '@pages/SimplifiedBankOnboarding/core/flow/flowRoutes';
import type {FlowNavigationState} from '@pages/SimplifiedBankOnboarding/core/flow/flowRoutes';
import {clearRequestState} from '@pages/SimplifiedBankOnboarding/core/requests/runRequest';
import PAGES from '@pages/SimplifiedBankOnboarding/flows/usd/personalInfo/personalInfoPages';
import PersonalInfoStep from '@pages/SimplifiedBankOnboarding/flows/usd/personalInfo/PersonalInfoStep';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {write} from '@pages/SimplifiedBankOnboarding/mockBackend/mockApi';

import ONYXKEYS from '@src/ONYXKEYS';
import SCREENS from '@src/SCREENS';

import type * as NativeNavigation from '@react-navigation/native';
import type ReactNative from 'react-native';

import React from 'react';
import Onyx from 'react-native-onyx';

import {answerWrites, renderInFlow} from '../../../utils/BankOnboardingLabStepTestUtils';
import getOnyxValue from '../../../utils/getOnyxValue';
import waitForBatchedUpdatesWithAct from '../../../utils/waitForBatchedUpdatesWithAct';

const POLICY_ID = '1';
const BANK_ACCOUNT_ID = 5;
const ROUTE_KEY = 'current-route';
const TARGET: FlowTarget = {kind: 'usd', policyID: POLICY_ID, backTo: undefined};
const {PAGE_NAMES} = SBO_CONST.USD;
const FULL_DRAFT: OnboardingDraft = {firstName: 'Alberta', lastName: 'Charleson', dob: '1990-01-01', ssnLast4: '1234'};

let mockNavigationState: FlowNavigationState = {routes: []};

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<typeof NativeNavigation>('@react-navigation/native'),
    useIsFocused: () => true,
    useRoute: () => ({key: 'current-route', name: 'CurrentScreen'}),
    useNavigation: () => ({getState: () => mockNavigationState, isFocused: () => true, addListener: () => () => {}}),
    useNavigationState: <TResult,>(selector: (state: FlowNavigationState) => TResult) => selector(mockNavigationState),
}));

jest.mock('@libs/Navigation/Navigation', () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setParams: jest.fn(),
    dismissModal: jest.fn(),
}));

jest.mock('@pages/SimplifiedBankOnboarding/mockBackend/mockApi', () => ({
    read: jest.fn(),
    write: jest.fn(),
}));

jest.mock('@hooks/useNetwork', () => jest.fn(() => ({isOffline: false})));

jest.mock('@hooks/useLocalize', () => jest.fn(() => ({translate: (key: string) => key})));

// The real wrapper needs the whole screen stack. The stand-in keeps the content, the part of the step that is tested.
jest.mock('@components/InteractiveStepWrapper', () => {
    const RN = jest.requireActual<typeof ReactNative>('react-native');
    return ({children}: React.ComponentProps<typeof InteractiveStepWrapperModule>) => <RN.View>{children}</RN.View>;
});

type RenderOptions = {
    page?: PageID;
    isEditing?: boolean;

    /** The step of the route under this one. Set when the user arrived by Next. */
    stepBelow?: StepID;
};

async function renderPersonalInfoStep({page, isEditing = false, stepBelow}: RenderOptions = {}) {
    const screenName = SCREENS.SETTINGS.BANK_ONBOARDING_LAB.USD_SETUP;
    const routeBelow = stepBelow ? [{key: 'previous-route', name: screenName, params: {policyID: POLICY_ID, page: stepBelow}}] : [];
    mockNavigationState = {routes: [...routeBelow, {key: ROUTE_KEY, name: screenName, params: {policyID: POLICY_ID, page: PAGE_NAMES.REQUESTOR, subPage: page}}]};

    const position: FlowStepPosition = {
        step: PAGE_NAMES.REQUESTOR,
        previousStep: PAGE_NAMES.BANK_ACCOUNT,
        nextStep: PAGE_NAMES.VERIFY_IDENTITY,
        counterIndex: 2,
        counterNames: ['1', '2', '3', '4', '5', '6', '7'],
        page,
        isEditing,
    };

    await renderInFlow(<PersonalInfoStep />, {target: TARGET, position, bankAccountID: BANK_ACCOUNT_ID});
}

async function setSavedData(achData: ACHData, draft: OnboardingDraft = {}) {
    await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {achData: {policyID: POLICY_ID, bankAccountID: BANK_ACCOUNT_ID, ...achData}});
    await Onyx.set(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT, draft);
    await waitForBatchedUpdatesWithAct();
}

async function press(text: string) {
    fireEvent.press(screen.getByText(text));
    await waitForBatchedUpdatesWithAct();
}

function expectPersonalInfoSent(confirm: boolean) {
    expect(write).toHaveBeenCalledWith(WRITE_COMMANDS.UPDATE_PERSONAL_INFORMATION, {policyID: POLICY_ID, bankAccountID: BANK_ACCOUNT_ID, ...FULL_DRAFT, confirm}, expect.anything());
}

function getPageRoute(page: PageID, editReturnPage?: PageID) {
    return getFlowRoute(TARGET, {step: PAGE_NAMES.REQUESTOR, page, isEditing: !!editReturnPage, editReturnPage});
}

describe('USD PersonalInfoStep', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.mocked(useNetwork).mockReturnValue({isOffline: false});
        answerWrites('success');
        await clearRequestState();
        await Onyx.clear();
        await waitForBatchedUpdatesWithAct();
    });

    afterAll(() => clearRequestState());

    describe('the start page', () => {
        it('opens full name after Next from the bank step even when every page is answered', async () => {
            // Given a setup whose personal info is complete, and the bank step under this one because the user pressed Next
            await setSavedData({}, FULL_DRAFT);

            // When the step opens without a page
            await renderPersonalInfoStep({stepBelow: PAGE_NAMES.BANK_ACCOUNT});

            // Then Next continues in order, so the first page opens and the URL gets it
            expect(screen.getByText('personalInfoStep.enterYourLegalFirstAndLast')).toBeOnTheScreen();
            expect(Navigation.setParams).toHaveBeenCalledWith({subPage: PAGES.FULL_NAME}, ROUTE_KEY);
        });

        it('opens the first page that is not answered on a resume', async () => {
            // Given a setup where the server holds the name and the date of birth but no SSN
            await setSavedData({firstName: 'Alberta', lastName: 'Charleson', dob: '1990-01-01'});

            // When the step opens without a page and without Next, as "Continue with setup" does
            await renderPersonalInfoStep();

            // Then the user lands on the first question that still misses an answer (USD-38)
            expect(screen.getByText('personalInfoStep.enterTheLast4')).toBeOnTheScreen();
            expect(Navigation.setParams).toHaveBeenCalledWith({subPage: PAGES.SSN}, ROUTE_KEY);
        });

        it('opens the confirmation on a resume when every page is answered', async () => {
            // Given a setup whose personal info is complete
            await setSavedData({}, FULL_DRAFT);

            // When the step opens without a page and without Next
            await renderPersonalInfoStep();

            // Then the confirmation opens, because no question misses an answer
            expect(screen.getByText('personalInfoStep.letsDoubleCheck')).toBeOnTheScreen();
        });

        it('opens full name on a resume while the server reviews the setup', async () => {
            // Given a complete setup that the server is reviewing
            await setSavedData({state: SBO_CONST.STATE.VERIFYING}, FULL_DRAFT);

            // When the step opens without a page and without Next
            await renderPersonalInfoStep();

            // Then the step starts at the first page, so the user walks through every answer again
            expect(screen.getByText('personalInfoStep.enterYourLegalFirstAndLast')).toBeOnTheScreen();
        });
    });

    describe('the progress save', () => {
        it.each<[PageID, PageID]>([
            [PAGES.FULL_NAME, PAGES.DATE_OF_BIRTH],
            [PAGES.DATE_OF_BIRTH, PAGES.SSN],
            [PAGES.SSN, PAGES.CONFIRMATION],
        ])('saves all answers without confirming after %s and opens %s', async (page, nextPage) => {
            // Given a draft with every answer
            await setSavedData({}, FULL_DRAFT);
            await renderPersonalInfoStep({page});

            // When the user submits the input page
            await press('common.next');

            // Then the four answers are saved with confirm false, so the server keeps them if the user leaves, and the
            // next page opens at once
            expectPersonalInfoSent(false);
            expect(Navigation.navigate).toHaveBeenCalledWith(getPageRoute(nextPage));
        });

        it.each<PageID>([PAGES.FULL_NAME, PAGES.DATE_OF_BIRTH, PAGES.SSN])('keeps the %s page enabled offline', async (page) => {
            // Given a draft with every answer and no network
            await setSavedData({}, FULL_DRAFT);
            jest.mocked(useNetwork).mockReturnValue({isOffline: true});
            await renderPersonalInfoStep({page});

            // When the user submits the input page
            await press('common.next');

            // Then the page moves on, because the progress save is not a request of the page and waits in the queue (BC-15)
            expect(Navigation.navigate).toHaveBeenCalledTimes(1);
            expectPersonalInfoSent(false);
        });
    });

    describe('the confirmation', () => {
        it('confirms the answers and opens the identity check after the server accepted them', async () => {
            // Given a draft with every answer on the confirmation page
            await setSavedData({}, FULL_DRAFT);
            await renderPersonalInfoStep({page: PAGES.CONFIRMATION});

            // When the user confirms
            await press('common.confirm');

            // Then the answers are sent with confirm true, and the next step opens once the server answered
            expectPersonalInfoSent(true);
            expect(Navigation.navigate).toHaveBeenCalledWith(getFlowRoute(TARGET, {step: PAGE_NAMES.VERIFY_IDENTITY}));
        });

        it('opens a row in edit mode', async () => {
            // Given a draft with every answer on the confirmation page
            await setSavedData({}, FULL_DRAFT);
            await renderPersonalInfoStep({page: PAGES.CONFIRMATION});

            // When the user presses the SSN row, with an event because MenuItem ignores a press without one
            fireEvent.press(screen.getByText('personalInfoStep.last4SSN'), {nativeEvent: {}});
            await waitForBatchedUpdatesWithAct();

            // Then the SSN page opens in edit mode with the confirmation as its return page, so its submit returns there
            expect(Navigation.navigate).toHaveBeenCalledWith(getPageRoute(PAGES.SSN, PAGES.CONFIRMATION));
        });
    });

    describe('edit mode', () => {
        it('saves the edited answer on submit and returns to the confirmation without a request', async () => {
            // Given the SSN page opened from the confirmation
            await setSavedData({}, FULL_DRAFT);
            await renderPersonalInfoStep({page: PAGES.SSN, isEditing: true});

            // When the user types a new SSN, which stays out of the draft until the submit, and confirms it
            fireEvent.changeText(screen.getByLabelText('personalInfoStep.last4SSN'), '5678');
            await waitForBatchedUpdatesWithAct();
            const draftWhileTyping = await getOnyxValue(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);
            await press('common.confirm');

            // Then the draft gets the new answer only on submit, nothing is sent, and Back returns to the confirmation
            expect(draftWhileTyping?.ssnLast4).toBe(FULL_DRAFT.ssnLast4);
            const draft = await getOnyxValue(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);
            expect(draft?.ssnLast4).toBe('5678');
            expect(write).not.toHaveBeenCalled();
            expect(Navigation.goBack).toHaveBeenCalledWith(getPageRoute(PAGES.CONFIRMATION));
        });
    });
});
