import {render} from '@testing-library/react-native';

import OnyxListItemProvider from '@components/OnyxListItemProvider';

import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import {saveFormDraft} from '@pages/SimplifiedBankOnboarding/core/draft/draft';
import {FlowStepPositionContext, OnboardingFlowActionsContext, OnboardingFlowStateContext} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';
import type {FlowStepPosition, FlowTarget, OnboardingFlowActions, OnboardingFlowState} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';
import {write} from '@pages/SimplifiedBankOnboarding/mockBackend/mockApi';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {OnyxData} from '@src/types/onyx/Request';

import type {ReactElement} from 'react';
import type {OnyxKey} from 'react-native-onyx';

import {NavigationContainer} from '@react-navigation/native';
import React from 'react';
import Onyx from 'react-native-onyx';

import waitForBatchedUpdatesWithAct from './waitForBatchedUpdatesWithAct';

type TestFlowSetup = {
    target: FlowTarget;

    /** Undefined renders no step around the content, as for a page that gets its navigation from its own providers */
    position?: FlowStepPosition;
    bankAccountID?: number;
    flowActions?: OnboardingFlowActions;
};

/** Flow exits as mocks. By default saveDraft merges into the draft of the lab form, as the flow does. */
function createTestFlowActions(
    saveDraft: OnboardingFlowActions['saveDraft'] = jest.fn((values: OnboardingDraft) => saveFormDraft(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM, values)),
): OnboardingFlowActions {
    return {saveDraft, returnToEntry: jest.fn(), leaveFlow: jest.fn(), openStep: jest.fn()};
}

/** Puts a step or a page inside the providers that OnboardingFlow and the screen give a step of the lab form */
function wrapInFlow(content: ReactElement, {target, position, bankAccountID = CONST.DEFAULT_NUMBER_ID, flowActions = createTestFlowActions()}: TestFlowSetup) {
    const flowState: OnboardingFlowState = {
        target,
        bankAccount: {policyID: target.policyID, bankAccountID},
        formID: ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM,
    };

    return (
        <OnyxListItemProvider>
            <NavigationContainer>
                <OnboardingFlowStateContext.Provider value={flowState}>
                    <OnboardingFlowActionsContext.Provider value={flowActions}>
                        <FlowStepPositionContext.Provider value={position}>{content}</FlowStepPositionContext.Provider>
                    </OnboardingFlowActionsContext.Provider>
                </OnboardingFlowStateContext.Provider>
            </NavigationContainer>
        </OnyxListItemProvider>
    );
}

/** Renders a step or a page inside the flow providers and waits until Onyx has settled */
async function renderInFlow(content: ReactElement, setup: TestFlowSetup) {
    render(wrapInFlow(content, setup));
    await waitForBatchedUpdatesWithAct();
}

/** The mocked API applies the data of every write the way the server answers it. Needs a jest.mock of mockApi in the test file. */
function answerWrites(answer: 'success' | 'failure') {
    jest.mocked(write).mockImplementation((_command, _params, onyxData: OnyxData<OnyxKey> = {}) => {
        Onyx.update(onyxData.optimisticData ?? [])
            .then(() => Onyx.update(answer === 'success' ? (onyxData.successData ?? []) : (onyxData.failureData ?? [])))
            .then(() => Onyx.update(onyxData.finallyData ?? []));
    });
}

export {answerWrites, createTestFlowActions, renderInFlow, wrapInFlow};
