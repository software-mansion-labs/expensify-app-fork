/**
 * Runs one flow on one screen: it owns the step order, the skip rules, the step counter, the form of the flow, the bank
 * account scope of the requests and the two exits, and renders the step that the URL names.
 *
 * What it hides: the account gate of the USD and NonUSD flows (BC-25), the parsing of the route params, the replace of a
 * missing, unknown or skipped step, and the contexts that the step shell and the blocks read.
 */
import FullPageOfflineBlockingView from '@components/BlockingViews/FullPageOfflineBlockingView';
import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';
import Header from '@components/Header';
import ScreenWrapper from '@components/ScreenWrapper';

import useNetwork from '@hooks/useNetwork';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import Navigation from '@libs/Navigation/Navigation';

import NotFoundPage from '@pages/ErrorPage/NotFoundPage';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {PageID, StepID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import openOnboardingPage from '@pages/SimplifiedBankOnboarding/core/accountRead/openOnboardingPage';
import {clearDraft, saveFormDraft} from '@pages/SimplifiedBankOnboarding/core/draft/draft';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React, {useEffect, useRef, useState} from 'react';
import {View} from 'react-native';

import type {FlowStepPosition, FlowTarget, OnboardingFlowActions, OnboardingFlowState} from './flowContext';

import {FlowStepPositionContext, getFlowBankAccount, OnboardingFlowActionsContext, OnboardingFlowStateContext} from './flowContext';
import {getFlowRoute, parseFlowPosition} from './flowRoutes';
import PageLoadingIndicator from './PageLoadingIndicator';
import {getAdjacentSteps, getStepCounter, readFlowSteps, resolveFlowStep} from './readFlowSteps';

type OnboardingFlowProps = {
    target: FlowTarget;

    /** The route params as they are. The shell narrows them with isStepID and isPageID. */
    params: {page?: string; subPage?: string; action?: string} | undefined;

    /** The step that opens when the URL names no step or an unknown one. Default: the first step that is not skipped. */
    resumeAt?: StepID;

    /** FlowStep elements in flow order. Fragments and arrays are flattened. Other children are ignored. */
    children: React.ReactNode;
};

type AccountReadStatus = 'idle' | 'pending' | 'succeeded' | 'failed';

type AccountGateView = 'flow' | 'loading' | 'offline' | 'notFound';

/**
 * The account gate (BC-25). It reads the account of the route's workspace once per mount, when Onyx holds no account
 * or the account of another workspace, and clears the main draft right before, because that draft belongs to the
 * account that Onyx held. It never reads during a reset, and never without a policyID in the route.
 */
function useAccountGate(target: FlowTarget): AccountGateView {
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const {isOffline} = useNetwork();
    const [readStatus, setReadStatus] = useState<AccountReadStatus>('idle');
    const hasStartedReadRef = useRef(false);

    const gatePolicyID = target.kind === 'enterSignerInfo' ? undefined : target.policyID;
    const isResetRunning = account?.pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE;
    const accountPolicyID = account?.achData?.policyID;
    const doesAccountNameOtherWorkspace = !!accountPolicyID && accountPolicyID !== gatePolicyID;
    const isReadNeeded = !!gatePolicyID && !isResetRunning && (account === undefined || doesAccountNameOtherWorkspace);

    useEffect(() => {
        if (!gatePolicyID || !isReadNeeded || isOffline || hasStartedReadRef.current) {
            return;
        }
        hasStartedReadRef.current = true;

        clearDraft()
            .then(() => {
                setReadStatus('pending');
                return openOnboardingPage({policyID: gatePolicyID});
            })
            .then((outcome) => {
                if (outcome.status === 'skipped') {
                    // The read was not sent (the app went offline), so it may start again after the reconnect
                    hasStartedReadRef.current = false;
                    setReadStatus('idle');
                    return;
                }
                setReadStatus(outcome.status);
            });
    }, [gatePolicyID, isReadNeeded, isOffline]);

    if (!gatePolicyID) {
        return 'flow';
    }
    if (readStatus === 'failed') {
        return 'notFound';
    }
    if (readStatus === 'succeeded') {
        return doesAccountNameOtherWorkspace ? 'notFound' : 'flow';
    }
    if (readStatus === 'pending') {
        return 'loading';
    }
    if (!isReadNeeded) {
        return 'flow';
    }
    return isOffline ? 'offline' : 'loading';
}

/**
 * Runs one flow on one screen.
 *
 * - Account gate (BC-25), USD and NonUSD only, see useAccountGate.
 * - It renders the component of the step named in the URL. A missing or unknown step is replaced with `resumeAt`, a
 *   skipped step with the next step that is not skipped (forceReplace). In the one render before the replace lands it
 *   shows PageLoadingIndicator.
 * - It gives the step shell the previous and the next step that are not skipped, the counter and the parsed position.
 */
function OnboardingFlow({target, params, resumeAt, children}: OnboardingFlowProps) {
    const styles = useThemeStyles();
    const [achData] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {selector: (account) => account?.achData});
    const gateView = useAccountGate(target);

    const formID = target.kind === 'enterSignerInfo' ? ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM : ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM;
    const steps = readFlowSteps(children);
    const urlPosition = parseFlowPosition(target, params);
    const shownStep = resolveFlowStep(steps, urlPosition.step, resumeAt);
    const replacementRoute = gateView === 'flow' && shownStep && shownStep.id !== urlPosition.step ? getFlowRoute(target, {step: shownStep.id}) : undefined;

    useEffect(() => {
        if (!replacementRoute) {
            return;
        }
        Navigation.navigate(replacementRoute, {forceReplace: true});
    }, [replacementRoute]);

    if (gateView === 'loading') {
        return <FullScreenLoadingIndicator shouldUseGoBackButton />;
    }
    if (gateView === 'offline') {
        return (
            <ScreenWrapper testID="SimplifiedBankOnboardingAccountGateOffline">
                <Header>
                    <Header.BackButton onPress={() => Navigation.goBack()} />
                </Header>
                <FullPageOfflineBlockingView>
                    <FullScreenLoadingIndicator />
                </FullPageOfflineBlockingView>
            </ScreenWrapper>
        );
    }
    if (gateView === 'notFound' || !shownStep) {
        return <NotFoundPage />;
    }
    if (replacementRoute) {
        return <PageLoadingIndicator />;
    }

    const flowState: OnboardingFlowState = {target, bankAccount: getFlowBankAccount(target, achData), formID};
    const flowActions: OnboardingFlowActions = {
        saveDraft: (values: OnboardingDraft) => saveFormDraft(formID, values),
        returnToEntry: () => Navigation.goBack(),
        leaveFlow: () => {
            if (target.kind === 'enterSignerInfo') {
                Navigation.goBack();
                return;
            }
            if (target.backTo) {
                Navigation.goBack(target.backTo);
                return;
            }
            Navigation.dismissModal();
        },
        openStep: (step: StepID, page?: PageID) => Navigation.navigate(getFlowRoute(target, {step, page})),
    };
    const counter = getStepCounter(steps, shownStep.id);
    const stepPosition: FlowStepPosition = {
        step: shownStep.id,
        ...getAdjacentSteps(steps, shownStep.id),
        counterIndex: counter?.index,
        counterNames: counter?.names,
        page: urlPosition.page,
        isEditing: !!urlPosition.isEditing,
    };
    const StepComponent = shownStep.component;

    return (
        <OnboardingFlowStateContext.Provider value={flowState}>
            <OnboardingFlowActionsContext.Provider value={flowActions}>
                <FlowStepPositionContext.Provider value={stepPosition}>
                    <View style={[styles.flex1, styles.appBG]}>
                        <StepComponent />
                    </View>
                </FlowStepPositionContext.Provider>
            </OnboardingFlowActionsContext.Provider>
        </OnboardingFlowStateContext.Provider>
    );
}

export default OnboardingFlow;
export type {OnboardingFlowProps};
