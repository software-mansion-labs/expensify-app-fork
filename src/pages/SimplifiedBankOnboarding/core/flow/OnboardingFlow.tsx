/**
 * Runs one flow on one screen: it owns the step order, the skip rules, the step counter, the form of the flow, the bank
 * account scope of the requests and the two exits, and renders the step that the URL names.
 *
 * What it hides: the account gate of the USD and NonUSD flows (BC-25), the parsing of the route params, the step that a
 * missing, unknown or skipped URL step opens, and the contexts that the step shell and the blocks read.
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
import type {OnboardingAccount} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import openOnboardingPage from '@pages/SimplifiedBankOnboarding/core/accountRead/openOnboardingPage';
import {clearDraft, saveFormDraft} from '@pages/SimplifiedBankOnboarding/core/draft/draft';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import type {OnyxEntry} from 'react-native-onyx';

import {useRoute} from '@react-navigation/native';
import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {View} from 'react-native';

import type {FlowStepPosition, FlowTarget, OnboardingFlowActions, OnboardingFlowState} from './flowContext';

import {FlowStepPositionContext, getFlowBankAccount, OnboardingFlowActionsContext, OnboardingFlowStateContext} from './flowContext';
import {getFlowFormID} from './flowData';
import {getFlowRoute, leaveOnboarding, parseFlowPosition, writeShownStep} from './flowRoutes';
import PageLoadingIndicator from './PageLoadingIndicator';
import {getAdjacentSteps, getStepCounter, readFlowSteps, resolveFlowStep} from './readFlowSteps';

type OnboardingFlowProps = {
    target: FlowTarget;

    /** The route params as they are. The shell narrows the step with isStepID, and the step that renders checks the page. */
    params: {page?: string; subPage?: string; action?: string} | undefined;

    /** FlowStep elements in flow order. Fragments and arrays are flattened. */
    children: React.ReactNode;
};

type AccountReadStatus = 'idle' | 'pending' | 'succeeded' | 'failed';

type AccountGateView = 'flow' | 'loading' | 'offline' | 'notFound';

type GateAccount = {
    /** The workspace that the account in Onyx describes */
    policyID: string | undefined;
    isResetRunning: boolean;
};

/** The two facts of the account that the gate reads, so the other changes of the account do not render the flow root again */
function selectGateAccount(account: OnyxEntry<OnboardingAccount>): GateAccount {
    return {
        policyID: account?.achData?.policyID,
        isResetRunning: account?.pendingAction === CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE,
    };
}

/**
 * The account gate (BC-25). It reads the account of the route's workspace once per mount, when Onyx holds no account of
 * that workspace, and clears the main draft right before, because that draft belongs to the account that Onyx held. It
 * never reads during a reset, and never without a policyID in the route.
 */
function useAccountGate(target: FlowTarget): AccountGateView {
    const [gateAccount] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {selector: selectGateAccount});
    const {isOffline} = useNetwork();
    const [readStatus, setReadStatus] = useState<AccountReadStatus>('idle');
    const hasStartedReadRef = useRef(false);

    const gatePolicyID = target.kind === 'enterSignerInfo' ? undefined : target.policyID;
    const isAccountOfWorkspace = !!gatePolicyID && gateAccount?.policyID === gatePolicyID;
    const isReadNeeded = !!gatePolicyID && !gateAccount?.isResetRunning && !isAccountOfWorkspace;

    // An answer that arrives after the flow closed or moved to another workspace must not set the state of this one.
    // The effect below cannot cancel it in its own cleanup, because the answer itself changes `isReadNeeded`.
    const shownPolicyIDRef = useRef<string | undefined>(undefined);
    useEffect(() => {
        shownPolicyIDRef.current = gatePolicyID;
        return () => {
            shownPolicyIDRef.current = undefined;
        };
    }, [gatePolicyID]);

    useEffect(() => {
        if (!gatePolicyID || !isReadNeeded || isOffline || hasStartedReadRef.current) {
            return;
        }
        hasStartedReadRef.current = true;

        clearDraft()
            .then(() => {
                if (shownPolicyIDRef.current === gatePolicyID) {
                    setReadStatus('pending');
                }
                return openOnboardingPage({policyID: gatePolicyID});
            })
            .then((outcome) => {
                if (shownPolicyIDRef.current !== gatePolicyID) {
                    return;
                }
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
        return isAccountOfWorkspace ? 'flow' : 'notFound';
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
 * - It renders the FlowStep named in the URL. A skipped step opens the next step that is not skipped. A missing or
 *   unknown step opens the first step that is neither skipped nor complete. Such a step is shown in the same
 *   render, and the URL is corrected in place, so the route and the screen under it stay as they are.
 * - It gives the step shell the steps around the shown one, the counter and the parsed position.
 */
function OnboardingFlow({target, params, children}: OnboardingFlowProps) {
    const styles = useThemeStyles();
    const route = useRoute();
    const [achData] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {selector: (account) => account?.achData});
    const gateView = useAccountGate(target);

    const formID = getFlowFormID(target);
    const steps = readFlowSteps(children);
    const urlPosition = parseFlowPosition(target, params);
    const shownStep = resolveFlowStep(steps, urlPosition.step);
    const isURLStepShown = shownStep?.id === urlPosition.step;
    const stepToWrite = gateView === 'flow' && shownStep && !isURLStepShown ? shownStep.id : undefined;

    // A layout effect, because it has to run before the effect of the step shell that writes the sub page of the shown
    // step in the same commit. In the other order this write would drop that sub page.
    useLayoutEffect(() => {
        if (!stepToWrite) {
            return;
        }
        writeShownStep(route.key, stepToWrite);
    }, [stepToWrite, route.key]);

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
                    <PageLoadingIndicator />
                </FullPageOfflineBlockingView>
            </ScreenWrapper>
        );
    }
    if (gateView === 'notFound' || !shownStep) {
        return <NotFoundPage />;
    }

    const flowState: OnboardingFlowState = {
        target,
        bankAccount: getFlowBankAccount(target, achData),
        formID,
    };
    const flowActions: OnboardingFlowActions = {
        saveDraft: (values: OnboardingDraft) => saveFormDraft(formID, values),
        returnToEntry: () => Navigation.goBack(),
        leaveFlow: () => {
            if (target.kind === 'enterSignerInfo') {
                Navigation.goBack();
                return;
            }
            leaveOnboarding(target.backTo);
        },
        openStep: (step: StepID, page?: PageID) => Navigation.navigate(getFlowRoute(target, {step, page})),
    };
    const counter = getStepCounter(steps, shownStep.id);
    const stepPosition: FlowStepPosition = {
        step: shownStep.id,
        ...getAdjacentSteps(steps, shownStep.id),
        counterIndex: counter?.index,
        counterNames: counter?.names,
        page: isURLStepShown ? urlPosition.page : undefined,
        isEditing: isURLStepShown && !!urlPosition.isEditing,
    };
    return (
        <OnboardingFlowStateContext.Provider value={flowState}>
            <OnboardingFlowActionsContext.Provider value={flowActions}>
                <FlowStepPositionContext.Provider value={stepPosition}>
                    <View style={[styles.flex1, styles.appBG]}>
                        {/* Two steps can render the same component, so the key mounts a new step instead of keeping the state of the one before */}
                        <React.Fragment key={shownStep.id}>{shownStep.element}</React.Fragment>
                    </View>
                </FlowStepPositionContext.Provider>
            </OnboardingFlowActionsContext.Provider>
        </OnboardingFlowStateContext.Provider>
    );
}

export default OnboardingFlow;
export type {OnboardingFlowProps};
