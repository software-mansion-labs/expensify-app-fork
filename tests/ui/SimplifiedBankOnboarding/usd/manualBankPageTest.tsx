import {fireEvent, render, screen} from '@testing-library/react-native';

import type InteractiveStepWrapperModule from '@components/InteractiveStepWrapper';
import OnyxListItemProvider from '@components/OnyxListItemProvider';

import useNetwork from '@hooks/useNetwork';

import Navigation from '@libs/Navigation/Navigation';

import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {ACHData} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {saveFormDraft} from '@pages/SimplifiedBankOnboarding/core/draft/draft';
import {FlowStepPositionContext, OnboardingFlowActionsContext, OnboardingFlowStateContext} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';
import type {FlowStepPosition, FlowTarget, OnboardingFlowActions, OnboardingFlowState} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';
import {getFlowRoute} from '@pages/SimplifiedBankOnboarding/core/flow/flowRoutes';
import type {FlowNavigationState} from '@pages/SimplifiedBankOnboarding/core/flow/flowRoutes';
import {clearRequestState} from '@pages/SimplifiedBankOnboarding/core/requests/runRequest';
import PAGES from '@pages/SimplifiedBankOnboarding/flows/usd/bankAccount/bankAccountPages';
import BankAccountStep from '@pages/SimplifiedBankOnboarding/flows/usd/bankAccount/BankAccountStep';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {write} from '@pages/SimplifiedBankOnboarding/mockBackend/mockApi';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import SCREENS from '@src/SCREENS';
import type {OnyxData} from '@src/types/onyx/Request';

import type * as NativeNavigation from '@react-navigation/native';
import type ReactNative from 'react-native';
import type {OnyxKey} from 'react-native-onyx';

import {NavigationContainer} from '@react-navigation/native';
import React from 'react';
import Onyx from 'react-native-onyx';

import waitForBatchedUpdatesWithAct from '../../../utils/waitForBatchedUpdatesWithAct';

const POLICY_ID = '1';
const BANK_ACCOUNT_ID = 5;
const ROUTE_KEY = 'current-route';
const TARGET: FlowTarget = {kind: 'usd', policyID: POLICY_ID, backTo: undefined};
const {PAGE_NAMES} = SBO_CONST.USD;
const MANUAL_DRAFT: OnboardingDraft = {setupType: SBO_CONST.SETUP_TYPE.MANUAL};
const ROUTING_NUMBER = '011000015';
const ACCOUNT_NUMBER = '123456789';
const MASKED_ACCOUNT_NUMBER = 'XXXXX6789';

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

const flowActions: OnboardingFlowActions = {
    saveDraft: (values) => saveFormDraft(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM, values),
    returnToEntry: jest.fn(),
    leaveFlow: jest.fn(),
    openStep: jest.fn(),
};

/** Opens the bank step the way Next from the country step does: without a page, with the country step under it */
async function renderBankAccountStep(bankAccountID: number | undefined) {
    const screenName = SCREENS.SETTINGS.BANK_ONBOARDING_LAB.USD_SETUP;
    mockNavigationState = {
        routes: [
            {key: 'previous-route', name: screenName, params: {policyID: POLICY_ID, page: PAGE_NAMES.COUNTRY}},
            {key: ROUTE_KEY, name: screenName, params: {policyID: POLICY_ID, page: PAGE_NAMES.BANK_ACCOUNT}},
        ],
    };

    const flowState: OnboardingFlowState = {
        target: TARGET,
        bankAccount: {policyID: POLICY_ID, bankAccountID: bankAccountID ?? CONST.DEFAULT_NUMBER_ID},
        formID: ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM,
    };
    const position: FlowStepPosition = {
        step: PAGE_NAMES.BANK_ACCOUNT,
        previousStep: PAGE_NAMES.COUNTRY,
        nextStep: PAGE_NAMES.REQUESTOR,
        counterIndex: 1,
        counterNames: ['1', '2', '3', '4', '5', '6', '7'],
        page: undefined,
        isEditing: false,
    };

    render(
        <OnyxListItemProvider>
            <NavigationContainer>
                <OnboardingFlowStateContext.Provider value={flowState}>
                    <OnboardingFlowActionsContext.Provider value={flowActions}>
                        <FlowStepPositionContext.Provider value={position}>
                            <BankAccountStep />
                        </FlowStepPositionContext.Provider>
                    </OnboardingFlowActionsContext.Provider>
                </OnboardingFlowStateContext.Provider>
            </NavigationContainer>
        </OnyxListItemProvider>,
    );
    await waitForBatchedUpdatesWithAct();
}

async function setSavedData(achData: ACHData) {
    await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {achData: {policyID: POLICY_ID, ...achData}});
    await Onyx.set(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT, MANUAL_DRAFT);
    await waitForBatchedUpdatesWithAct();
}

async function pressNext() {
    fireEvent.press(screen.getByText('common.next'));
    await waitForBatchedUpdatesWithAct();
}

/** The mock API applies the success data of every write, as the server does for a valid request */
function answerWritesWithSuccess() {
    jest.mocked(write).mockImplementation((_command, _params, onyxData: OnyxData<OnyxKey> = {}) => {
        Onyx.update(onyxData.optimisticData ?? [])
            .then(() => Onyx.update(onyxData.successData ?? []))
            .then(() => Onyx.update(onyxData.finallyData ?? []));
    });
}

describe('USD ManualBankPage', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.mocked(useNetwork).mockReturnValue({isOffline: false});
        answerWritesWithSuccess();
        await clearRequestState();
        await Onyx.clear();
        await waitForBatchedUpdatesWithAct();
    });

    afterAll(() => clearRequestState());

    it('opens the manual variant after Next from the country step', async () => {
        // Given a user who picked the manual setup on the entry page
        await setSavedData({});

        // When the bank step opens without a page
        await renderBankAccountStep(undefined);

        // Then only the manual variant renders, and the URL gets its page
        expect(screen.getByText('bankAccount.manuallyAdd')).toBeOnTheScreen();
        expect(screen.queryByText('[mock] Log in to the bank')).not.toBeOnTheScreen();
        expect(Navigation.setParams).toHaveBeenCalledWith({subPage: PAGES.MANUAL}, ROUTE_KEY);
    });

    it('connects the typed numbers trimmed and opens the personal info step', async () => {
        // Given a manual setup without a bank account on the server
        await setSavedData({});
        await renderBankAccountStep(undefined);

        // When the user types both numbers with spaces around them and presses Next
        fireEvent.changeText(screen.getByLabelText('bankAccount.routingNumber'), ` ${ROUTING_NUMBER} `);
        fireEvent.changeText(screen.getByLabelText('bankAccount.accountNumber'), ` ${ACCOUNT_NUMBER} `);
        await pressNext();

        // Then the server gets the trimmed numbers, and the next step opens once it accepted them
        expect(write).toHaveBeenCalledWith(
            WRITE_COMMANDS.CONNECT_BANK_ACCOUNT_MANUALLY,
            {policyID: POLICY_ID, routingNumber: ROUTING_NUMBER, accountNumber: ACCOUNT_NUMBER},
            expect.anything(),
        );
        expect(Navigation.navigate).toHaveBeenCalledWith(getFlowRoute(TARGET, {step: PAGE_NAMES.REQUESTOR}));
    });

    it('removes the typed numbers from the draft once the server created the bank account', async () => {
        // Given a manual setup where the user typed both numbers, which the inputs saved to the draft
        await setSavedData({});
        await renderBankAccountStep(undefined);
        fireEvent.changeText(screen.getByLabelText('bankAccount.routingNumber'), ROUTING_NUMBER);
        fireEvent.changeText(screen.getByLabelText('bankAccount.accountNumber'), ACCOUNT_NUMBER);

        // When the server accepts the numbers
        await pressNext();
        await waitForBatchedUpdatesWithAct();

        // Then the draft no longer holds them, so the locked page shows the masked numbers of the server and not the typed ones
        const draft = await Onyx.get(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);
        expect(draft?.routingNumber).toBeUndefined();
        expect(draft?.accountNumber).toBeUndefined();
    });

    it('shows the masked server number on the screen that stayed mounted after the bank account was created', async () => {
        // Given a manual setup where the user typed both numbers, so the form of this screen holds them
        await setSavedData({});
        await renderBankAccountStep(undefined);
        fireEvent.changeText(screen.getByLabelText('bankAccount.routingNumber'), ROUTING_NUMBER);
        fireEvent.changeText(screen.getByLabelText('bankAccount.accountNumber'), ACCOUNT_NUMBER);
        await pressNext();

        // When the server answer with the masked account number arrives while the screen is still mounted
        await Onyx.merge(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {
            achData: {bankAccountID: BANK_ACCOUNT_ID, routingNumber: ROUTING_NUMBER, accountNumber: MASKED_ACCOUNT_NUMBER},
        });
        await waitForBatchedUpdatesWithAct();

        // Then the locked input shows the masked number, because a user who comes back must not see the full number again
        expect(screen.getByDisplayValue(MASKED_ACCOUNT_NUMBER)).toHaveProp('readOnly', true);
        expect(screen.queryByDisplayValue(ACCOUNT_NUMBER)).not.toBeOnTheScreen();
    });

    it('locks the inputs with the saved numbers once the server created the bank account', async () => {
        // Given a bank account that the server already created, with the masked account number it returns
        await setSavedData({bankAccountID: BANK_ACCOUNT_ID, routingNumber: ROUTING_NUMBER, accountNumber: MASKED_ACCOUNT_NUMBER});

        // When the bank step opens
        await renderBankAccountStep(BANK_ACCOUNT_ID);

        // Then both inputs show the saved numbers and cannot change them
        expect(screen.getByDisplayValue(ROUTING_NUMBER)).toHaveProp('readOnly', true);
        expect(screen.getByDisplayValue(MASKED_ACCOUNT_NUMBER)).toHaveProp('readOnly', true);
    });

    it('goes on without a request when the form is locked (BC-12)', async () => {
        // Given a bank account that the server already created, so the form holds the masked account number
        await setSavedData({bankAccountID: BANK_ACCOUNT_ID, routingNumber: ROUTING_NUMBER, accountNumber: MASKED_ACCOUNT_NUMBER});
        await renderBankAccountStep(BANK_ACCOUNT_ID);

        // When the user presses Next
        await pressNext();

        // Then nothing is sent, because the masked number would overwrite the real one, and the next step opens
        expect(write).not.toHaveBeenCalled();
        expect(Navigation.navigate).toHaveBeenCalledWith(getFlowRoute(TARGET, {step: PAGE_NAMES.REQUESTOR}));
    });
});
