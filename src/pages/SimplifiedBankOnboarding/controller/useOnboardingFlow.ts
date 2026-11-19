import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';

import {getLatestErrorMessage} from '@libs/ErrorUtils';

import getPageRequestName from '@pages/SimplifiedBankOnboarding/flow/getPageRequestName';
import type {FlowPosition} from '@pages/SimplifiedBankOnboarding/flow/position';
import {findPage, findStep} from '@pages/SimplifiedBankOnboarding/flow/position';
import isPositionReachable from '@pages/SimplifiedBankOnboarding/flow/reachability';
import getResumePosition from '@pages/SimplifiedBankOnboarding/flow/resume';
import {getEditReturnPosition, getNextStepPosition, getPositionAfterSubmit, getPreviousPosition, getStepFirstPosition} from '@pages/SimplifiedBankOnboarding/flow/transitions';
import type {FlowPlan, PageConfig, PageID, PlanContext, StepConfig, StepID} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import {exitFlow, goBackToEntry, goBackToPosition, goToPosition, replacePosition} from '@pages/SimplifiedBankOnboarding/navigation/flowNavigation';
import {getPositionFromParams} from '@pages/SimplifiedBankOnboarding/navigation/routes';
import type {FlowRouteParams, FlowRouteTarget} from '@pages/SimplifiedBankOnboarding/navigation/routes';
import {saveDraft} from '@pages/SimplifiedBankOnboarding/requests/draft';
import useRequestState from '@pages/SimplifiedBankOnboarding/requests/useRequestState';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/types/form';

import ONYXKEYS from '@src/ONYXKEYS';
import {isEmptyObject} from '@src/types/utils/EmptyObject';

/**
 * The controller of a flow screen. It builds the plan in render from the draft and the server data, reads the position
 * from the URL and gives the page its handlers. Every move happens in a handler: it writes the draft, rebuilds the plan
 * from fresh Onyx data, runs the request of the page or, at the end of a step, the step request and only then navigates. The one effect redirects a
 * URL that names no reachable position.
 */
import {useIsFocused} from '@react-navigation/native';
import {useEffect, useEffectEvent, useRef} from 'react';
import Onyx from 'react-native-onyx';

import type {FlowData, FlowDescriptor} from './types';

import useFlowData from './useFlowData';

type OnboardingFlow = {
    data: FlowData;
    context: PlanContext;
    plan: FlowPlan;
    position: FlowPosition | undefined;
    step: StepConfig | undefined;
    page: PageConfig | undefined;

    /** The request that the open page sends is running */
    isSubmitting: boolean;

    /** The error of the request that the open page sends */
    errorText: string;
    submitPage: (values: OnboardingDraft) => void;
    goBack: () => void;
    editPage: (pageID: PageID) => void;
    pressRow: (rowID: string) => void;
    goToStep: (stepID: StepID) => void;
};

function getPositionKey(position: FlowPosition | undefined): string {
    return position ? `${position.stepID}/${position.pageID}/${position.isEditing ? 'edit' : ''}` : '';
}

function useOnboardingFlow(flow: FlowDescriptor, target: FlowRouteTarget, routeParams: FlowRouteParams): OnboardingFlow {
    const {translate} = useLocalize();
    const {isOffline} = useNetwork();
    const isFocused = useIsFocused();
    const data = useFlowData();

    const context: PlanContext = {translate, policyID: target.policyID};
    const plan = flow.buildPlan(data, context);
    const urlPosition = getPositionFromParams(target, routeParams);
    const position = isPositionReachable(plan, urlPosition) ? urlPosition : undefined;
    const step = position ? findStep(plan, position.stepID) : undefined;
    const page = step && position ? findPage(step, position.pageID) : undefined;
    const requestState = useRequestState(getPageRequestName(step, page));

    // A handler is running: a second submit is ignored and the redirect waits, because the data changes under it
    const isHandlingRef = useRef(false);

    // The position that a handler navigated away from. The screen keeps it until the new URL arrives or it is focused again.
    const leftPositionKeyRef = useRef<string | undefined>(undefined);

    // After a draft write or a request the plan of the last render is stale, so handlers rebuild it from what Onyx holds now
    const rebuildPlan = async () => {
        const [draft, account, workspaces, bankFields, picklists] = await Onyx.multiGet([
            ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT,
            ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT,
            ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES,
            ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_BANK_FIELDS,
            ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PICKLISTS,
        ]);
        return flow.buildPlan({draft: draft ?? undefined, account, workspaces, bankFields, picklists}, context);
    };

    const leavePosition = (from: FlowPosition, navigate: () => void) => {
        leftPositionKeyRef.current = getPositionKey(from);
        navigate();
    };

    const runHandler = (handler: () => Promise<void>) => {
        if (isHandlingRef.current) {
            return;
        }
        isHandlingRef.current = true;
        handler().finally(() => {
            isHandlingRef.current = false;
        });
    };

    /**
     * Sends the request of a page that saves in the middle of its step. Returns the plan after it, or undefined when the
     * flow stays on the page: offline, while the request is pending or after it failed.
     */
    const runPageRequest = async (from: FlowPosition, currentPlan: FlowPlan): Promise<FlowPlan | undefined> => {
        const currentStep = findStep(currentPlan, from.stepID);
        const submittedPage = currentStep ? findPage(currentStep, from.pageID) : undefined;
        if (!submittedPage?.submit) {
            return currentPlan;
        }
        if (isOffline || requestState.isPending) {
            return undefined;
        }
        const outcome = await submittedPage.submit();
        if (outcome.status !== 'succeeded') {
            return undefined;
        }
        return rebuildPlan();
    };

    /** Runs the request of a finished step and opens the next step. The plan must hold the answers that the step sends. */
    const finishStep = async (from: FlowPosition, currentPlan: FlowPlan) => {
        const finishedStep = findStep(currentPlan, from.stepID);
        if (!finishedStep) {
            return;
        }
        if (finishedStep.submit) {
            // Offline the write stays queued and its Promise pending, so the step waits for the connection
            if (isOffline || requestState.isPending) {
                return;
            }
            const outcome = await finishedStep.submit();
            if (outcome.status !== 'succeeded') {
                return;
            }
        }
        const nextPlan = await rebuildPlan();
        const nextPosition = getNextStepPosition(nextPlan, currentPlan, from.stepID);
        leavePosition(from, () => (nextPosition ? goToPosition(target, nextPosition) : exitFlow(target)));
    };

    const submitPage = (values: OnboardingDraft) => {
        if (!position || !page) {
            return;
        }
        const from = position;
        const submittedPage = page;
        runHandler(async () => {
            const transition = submittedPage.onSubmit?.(values) ?? {};
            const draftUpdate = transition.draftUpdate ?? values;
            if (!isEmptyObject(draftUpdate)) {
                await saveDraft(draftUpdate);
            }
            const nextPlan = await runPageRequest(from, await rebuildPlan());
            if (!nextPlan) {
                return;
            }
            const editReturnPosition = from.isEditing ? getEditReturnPosition(nextPlan, from) : undefined;
            if (editReturnPosition) {
                leavePosition(from, () => goBackToPosition(target, editReturnPosition));
                return;
            }
            const nextPosition = getPositionAfterSubmit(nextPlan, from, transition);
            if (nextPosition) {
                leavePosition(from, () => goToPosition(target, nextPosition));
                return;
            }
            await finishStep(from, nextPlan);
        });
    };

    const goBack = () => {
        if (!position || !page) {
            exitFlow(target);
            return;
        }
        if (page.shouldExitOnBack) {
            exitFlow(target);
            return;
        }
        const previousPosition = getPreviousPosition(plan, position);
        if (!previousPosition) {
            goBackToEntry(target);
            return;
        }
        goBackToPosition(target, previousPosition);
    };

    const editPage = (pageID: PageID) => {
        if (!position) {
            return;
        }
        goToPosition(target, {stepID: position.stepID, pageID, isEditing: true});
    };

    const pressRow = (rowID: string) => {
        if (!position || page?.kind !== 'list' || !page.onRowPress) {
            return;
        }
        const from = position;
        const transition = page.onRowPress(rowID);
        runHandler(async () => {
            if (transition.draftUpdate) {
                await saveDraft(transition.draftUpdate);
            }
            const nextPageID = transition.nextPageID;
            if (!nextPageID) {
                return;
            }
            leavePosition(from, () => goToPosition(target, {stepID: from.stepID, pageID: nextPageID, isEditing: !!transition.isEditing}));
        });
    };

    const goToStep = (stepID: StepID) => {
        const stepPosition = getStepFirstPosition(plan, stepID);
        if (!stepPosition) {
            return;
        }
        goToPosition(target, stepPosition);
    };

    const urlPositionKey = getPositionKey(urlPosition);
    const isUnreachable = !position;

    const redirectToResume = useEffectEvent(() => {
        if (isHandlingRef.current || leftPositionKeyRef.current === urlPositionKey) {
            return;
        }
        const resumePosition = getResumePosition(plan);
        if (!resumePosition) {
            return;
        }
        leftPositionKeyRef.current = urlPositionKey;
        replacePosition(target, resumePosition);
    });

    useEffect(() => {
        if (!isFocused) {
            return;
        }
        // The screen is shown again, so the URL it left is the one the user came back to
        leftPositionKeyRef.current = undefined;
    }, [isFocused]);

    // The only navigation outside a handler: a deep link, a stale URL or a URL without a page has no page to show, so
    // the screen swaps it for the position where the flow resumes. It waits while a handler runs or has just left this
    // URL, because the data then changes before the navigation lands, and it redirects one URL only once.
    useEffect(() => {
        if (!isUnreachable || !isFocused) {
            return;
        }
        redirectToResume();
    }, [isUnreachable, isFocused, urlPositionKey]);

    return {
        data,
        context,
        plan,
        position,
        step,
        page,
        isSubmitting: requestState.isPending,
        errorText: getLatestErrorMessage({errors: requestState.errors}),
        submitPage,
        goBack,
        editPage,
        pressRow,
        goToStep,
    };
}

export default useOnboardingFlow;
export type {OnboardingFlow};
