import {fireEvent, render, screen} from '@testing-library/react-native';

import type InteractiveStepWrapperModule from '@components/InteractiveStepWrapper';
import OnyxListItemProvider from '@components/OnyxListItemProvider';
import Text from '@components/Text';

import Navigation from '@libs/Navigation/Navigation';

import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {NEXT_STEP} from '@pages/SimplifiedBankOnboarding/core';
import type {OnboardingRequest} from '@pages/SimplifiedBankOnboarding/core';
import {FlowStepPositionContext, OnboardingFlowActionsContext, OnboardingFlowStateContext} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';
import type {FlowStepPosition, FlowTarget, OnboardingFlowActions, OnboardingFlowState} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';
import {getFlowRoute} from '@pages/SimplifiedBankOnboarding/core/flow/flowRoutes';
import type {FlowNavigationState} from '@pages/SimplifiedBankOnboarding/core/flow/flowRoutes';
import {clearRequestState} from '@pages/SimplifiedBankOnboarding/core/requests/runRequest';
import OnboardingStep from '@pages/SimplifiedBankOnboarding/core/step/OnboardingStep';
import SubPage from '@pages/SimplifiedBankOnboarding/core/step/SubPage';
import OwnersListPage from '@pages/SimplifiedBankOnboarding/flows/shared/owners/OwnersListPage';
import type {OwnerRow} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/OwnersListPage';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {write} from '@pages/SimplifiedBankOnboarding/mockBackend/mockApi';

import ONYXKEYS from '@src/ONYXKEYS';
import type {OnyxData} from '@src/types/onyx/Request';

import type * as NativeNavigation from '@react-navigation/native';
import type ReactNative from 'react-native';
import type {OnyxKey} from 'react-native-onyx';

import {NavigationContainer} from '@react-navigation/native';
import React from 'react';
import Onyx from 'react-native-onyx';

import waitForBatchedUpdatesWithAct from '../../utils/waitForBatchedUpdatesWithAct';

const POLICY_ID = '1';
const TARGET: FlowTarget = {
    kind: 'usd',
    policyID: POLICY_ID,
    backTo: undefined,
};
const {PAGE_NAMES, BENEFICIAL_OWNERS_SUB_PAGES: PAGES} = SBO_CONST.USD;

const mockNavigationState: FlowNavigationState = {routes: []};

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<typeof NativeNavigation>('@react-navigation/native'),
    useIsFocused: () => true,
    useRoute: () => ({key: 'current-route', name: 'CurrentScreen'}),
    useNavigation: () => ({
        getState: () => mockNavigationState,
        isFocused: () => true,
        addListener: () => () => {},
    }),
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

jest.mock('@hooks/useLocalize', () => jest.fn(() => ({translate: (key: string) => key})));

// The real wrapper needs the whole screen stack, and the list only needs to be rendered inside a step.
jest.mock('@components/InteractiveStepWrapper', () => {
    const RN = jest.requireActual<typeof ReactNative>('react-native');
    return ({children}: React.ComponentProps<typeof InteractiveStepWrapperModule>) => <RN.View>{children}</RN.View>;
});

const OWNERS_REQUEST: OnboardingRequest = {
    name: 'usd.ownersListTest.confirm',
    build: ({bankAccount}) => ({
        type: 'write',
        command: WRITE_COMMANDS.UPDATE_BENEFICIAL_OWNERS,
        params: {
            ...bankAccount,
            ownsMoreThan25Percent: false,
            beneficialOwners: '[]',
            beneficialOwnerKeys: [],
        },
    }),
};

const USER_ROW: OwnerRow = {
    id: 'requestor',
    title: 'Ada Lovelace',
    description: '1990-01-01',
    isReadOnly: true,
};
const OWNER_ROW: OwnerRow = {
    id: 'alan',
    title: 'Alan Turing',
    description: '1991-02-02',
};

const PRESS_EVENT = {nativeEvent: {}};

const saveDraft = jest.fn((values: OnboardingDraft) => Onyx.merge(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT, values));
const getEditUpdate = jest.fn((id: string): OnboardingDraft => ({ownerBeingModifiedID: id}));

/** Applies the data of a write the way the mock API does */
function answerWrites(answer: 'success' | 'failure') {
    jest.mocked(write).mockImplementation((_command, _params, onyxData: OnyxData<OnyxKey> = {}) => {
        Onyx.update(onyxData.optimisticData ?? [])
            .then(() => Onyx.update(answer === 'success' ? (onyxData.successData ?? []) : (onyxData.failureData ?? [])))
            .then(() => Onyx.update(onyxData.finallyData ?? []));
    });
}

async function renderOwnersList(rows: OwnerRow[]) {
    const flowState: OnboardingFlowState = {
        target: TARGET,
        bankAccount: {policyID: POLICY_ID, bankAccountID: 0},
        formID: ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM,
    };
    const flowActions: OnboardingFlowActions = {
        saveDraft,
        returnToEntry: jest.fn(),
        leaveFlow: jest.fn(),
        openStep: jest.fn(),
    };
    const position: FlowStepPosition = {
        step: PAGE_NAMES.BENEFICIAL_OWNERS,
        previousStep: PAGE_NAMES.COMPANY,
        nextStep: PAGE_NAMES.ACH_CONTRACT,
        counterIndex: 4,
        counterNames: [],
        page: PAGES.UBOS_LIST,
        isEditing: false,
    };

    render(
        <OnyxListItemProvider>
            <NavigationContainer>
                <OnboardingFlowStateContext.Provider value={flowState}>
                    <OnboardingFlowActionsContext.Provider value={flowActions}>
                        <FlowStepPositionContext.Provider value={position}>
                            <OnboardingStep
                                title="Owners"
                                wrapperID="OwnersListTestStep"
                            >
                                <SubPage
                                    name={PAGES.UBOS_LIST}
                                    next={NEXT_STEP}
                                >
                                    <OwnersListPage
                                        rows={rows}
                                        request={OWNERS_REQUEST}
                                        detailsStartPage={PAGES.LEGAL_NAME}
                                        getEditUpdate={getEditUpdate}
                                    />
                                </SubPage>
                                <SubPage name={PAGES.LEGAL_NAME}>
                                    <Text>Name page</Text>
                                </SubPage>
                            </OnboardingStep>
                        </FlowStepPositionContext.Provider>
                    </OnboardingFlowActionsContext.Provider>
                </OnboardingFlowStateContext.Provider>
            </NavigationContainer>
        </OnyxListItemProvider>,
    );
    await waitForBatchedUpdatesWithAct();
}

describe('OwnersListPage', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.mocked(write).mockReset();
        clearRequestState(OWNERS_REQUEST.name, {
            policyID: POLICY_ID,
            bankAccountID: 0,
        });
        await Onyx.clear();
        await waitForBatchedUpdatesWithAct();
    });

    it('shows every owner under the owners label', async () => {
        // Given the read only row of the user and the row of another owner
        // When the list renders
        await renderOwnersList([USER_ROW, OWNER_ROW]);

        // Then both rows are shown with their details under the label
        expect(screen.getByText('beneficialOwnerInfoStep.owners:')).toBeOnTheScreen();
        expect(screen.getByText('Ada Lovelace')).toBeOnTheScreen();
        expect(screen.getByText('1990-01-01')).toBeOnTheScreen();
        expect(screen.getByText('Alan Turing')).toBeOnTheScreen();
    });

    it('hides the owners label without owners', async () => {
        // Given no owner rows, as after "nobody owns 25%"
        // When the list renders
        await renderOwnersList([]);

        // Then only the headline, the text and Confirm are shown
        expect(screen.getByText('beneficialOwnerInfoStep.letsDoubleCheck')).toBeOnTheScreen();
        expect(screen.queryByText('beneficialOwnerInfoStep.owners:')).not.toBeOnTheScreen();
    });

    it('saves the pressed owner into the buffer and then opens the first details page', async () => {
        // Given the row of another owner
        await renderOwnersList([OWNER_ROW]);

        // When the user presses it
        // The row ignores a press without an event, so the test passes one as a real press does
        fireEvent.press(screen.getByText('Alan Turing'), PRESS_EVENT);
        await waitForBatchedUpdatesWithAct();

        // Then the buffer update reaches the draft before the details page opens, not in edit mode
        expect(saveDraft).toHaveBeenCalledWith({
            ownerBeingModifiedID: OWNER_ROW.id,
        });
        expect(Navigation.navigate).toHaveBeenCalledWith(
            getFlowRoute(TARGET, {
                step: PAGE_NAMES.BENEFICIAL_OWNERS,
                page: PAGES.LEGAL_NAME,
            }),
        );
    });

    it('opens nothing from a read only row', async () => {
        // Given the read only row of the user, whose details belong to the personal info step
        await renderOwnersList([USER_ROW]);

        // When the user presses it
        fireEvent.press(screen.getByText('Ada Lovelace'), PRESS_EVENT);
        await waitForBatchedUpdatesWithAct();

        // Then nothing is saved and no page opens
        expect(saveDraft).not.toHaveBeenCalled();
        expect(Navigation.navigate).not.toHaveBeenCalled();
    });

    it('sends the request on Confirm and opens the next step after a success', async () => {
        // Given a server that accepts the owners
        answerWrites('success');
        await renderOwnersList([OWNER_ROW]);

        // When the user confirms
        fireEvent.press(screen.getByText('common.confirm'));
        await waitForBatchedUpdatesWithAct();

        // Then the request is sent once and the next step opens
        expect(write).toHaveBeenCalledTimes(1);
        expect(write).toHaveBeenCalledWith(WRITE_COMMANDS.UPDATE_BENEFICIAL_OWNERS, expect.objectContaining({policyID: POLICY_ID, beneficialOwners: '[]'}), expect.anything());
        expect(Navigation.navigate).toHaveBeenCalledWith(getFlowRoute(TARGET, {step: PAGE_NAMES.ACH_CONTRACT}));
    });

    it('shows the error above Confirm and stays after a failure', async () => {
        // Given a server that refuses the owners
        answerWrites('failure');
        await renderOwnersList([OWNER_ROW]);

        // When the user confirms
        fireEvent.press(screen.getByText('common.confirm'));
        await waitForBatchedUpdatesWithAct();

        // Then the generic error is shown and the step does not move on
        expect(screen.getByText('common.genericErrorMessage')).toBeOnTheScreen();
        expect(Navigation.navigate).not.toHaveBeenCalled();
    });
});
