/**
 * The controller of a flow screen. It builds the plan in render from the draft and the server data, takes the position
 * that the URL names from the screen and gives the page its handlers. Every move happens in a handler: it writes the draft, rebuilds the plan
 * from fresh Onyx data, runs the request of the page or, at the end of a step, the step request and only then navigates.
 * A request made offline waits in the queue and the page shows it as pending until it settles. A handler navigates
 * after a request only if the user is still on the page that sent it. The one effect redirects a URL that names no
 * reachable position, once the data of the plan is there. The read that the open page needs is sent when it opens.
 */
import useLocalize from '@hooks/useLocalize';

import {getLatestErrorMessage} from '@libs/ErrorUtils';

import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import {goBackToEntry, goBackToPosition, goToPosition, replacePosition} from '@pages/SimplifiedBankOnboarding/core/navigation/flowNavigation';
import type {FlowRoutes} from '@pages/SimplifiedBankOnboarding/core/navigation/flowNavigation';
import getPageRequestKey from '@pages/SimplifiedBankOnboarding/core/plan/getPageRequestKey';
import getStepInputIDsToClear from '@pages/SimplifiedBankOnboarding/core/plan/getStepInputIDsToClear';
import type {FlowPosition} from '@pages/SimplifiedBankOnboarding/core/plan/position/position';
import {findPage, findStep} from '@pages/SimplifiedBankOnboarding/core/plan/position/position';
import isPositionReachable from '@pages/SimplifiedBankOnboarding/core/plan/position/reachability';
import getResumePosition from '@pages/SimplifiedBankOnboarding/core/plan/position/resume';
import {getEditReturnPosition, getNextStepPosition, getPositionAfterSubmit, getPreviousPosition, getStepFirstPosition} from '@pages/SimplifiedBankOnboarding/core/plan/position/transitions';
import type {FlowPlan, FlowVocabulary, PageConfig, PlanContext, StepConfig} from '@pages/SimplifiedBankOnboarding/core/plan/types';
import clearRequestState from '@pages/SimplifiedBankOnboarding/core/requests/clearRequestState';
import type {RequestKey} from '@pages/SimplifiedBankOnboarding/core/requests/requestKey';
import useReadOnOpen from '@pages/SimplifiedBankOnboarding/core/requests/useReadOnOpen';
import useRequestState from '@pages/SimplifiedBankOnboarding/core/requests/useRequestState';

import ONYXKEYS from '@src/ONYXKEYS';
import {isEmptyObject} from '@src/types/utils/EmptyObject';

import {useIsFocused} from '@react-navigation/native';
import {useEffect, useEffectEvent, useRef} from 'react';
import Onyx from 'react-native-onyx';

import type {FlowDataSource, FlowDataStatus, FlowDescriptor} from './types';

type OnboardingFlowOptions<TData, TVocabulary extends FlowVocabulary> = {
    flow: FlowDescriptor<TData, TVocabulary>;
    routes: FlowRoutes;

    /** The position that the URL names. Undefined when it names no full and known position, so the flow opens the position where it resumes. */
    urlPosition: FlowPosition<TVocabulary> | undefined;

    /** The workspace of the URL */
    policyID: string | undefined;
    dataSource: FlowDataSource<TData>;

    /** The redirect waits until the data of the plan is there */
    dataStatus: FlowDataStatus;
};

type OnboardingFlow<TData, TVocabulary extends FlowVocabulary> = {
    data: TData;
    context: PlanContext;
    plan: FlowPlan<TVocabulary>;
    position: FlowPosition<TVocabulary> | undefined;
    step: StepConfig<TVocabulary> | undefined;
    page: PageConfig<TVocabulary> | undefined;

    /** The request that the open page sends is running */
    isSubmitting: boolean;

    /** The open page sends no request, so its submit only writes the draft and works without a connection */
    canSubmitOffline: boolean;

    /** The error of the request that the open page sends */
    errorText: string;

    /** The open page waits for the data of its read */
    isWaitingForRead: boolean;

    /** The read of the open page failed before its data was there, so the page has nothing to show */
    hasReadFailed: boolean;
    submitPage: (values: OnboardingDraft) => void;
    goBack: () => void;
    editPage: (pageID: string) => void;
    pressRow: (rowID: string) => void;
    goToStep: (stepID: TVocabulary['stepID']) => void;
};

function getPositionKey(position: FlowPosition | undefined): string {
    return position ? `${position.stepID}/${position.pageID}/${position.isEditing ? 'edit' : ''}` : '';
}

function useOnboardingFlow<TData, TVocabulary extends FlowVocabulary>({
    flow,
    routes,
    urlPosition,
    policyID,
    dataSource,
    dataStatus,
}: OnboardingFlowOptions<TData, TVocabulary>): OnboardingFlow<TData, TVocabulary> {
    const {translate} = useLocalize();
    const isFocused = useIsFocused();
    const {data, readData} = dataSource;

    const context: PlanContext = {translate, policyID};
    const plan = flow.buildPlan(data, context);
    const position = isPositionReachable(plan, urlPosition) ? urlPosition : undefined;
    const step = position ? findStep(plan, position.stepID) : undefined;
    const page = step && position ? findPage(step, position.pageID) : undefined;
    const pageRequestKey = getPageRequestKey(step, page);
    const requestState = useRequestState(pageRequestKey);
    const isDataReady = dataStatus === 'ready';

    // A read built from data that is not there yet could ask for the wrong thing, such as the bank inputs of no country
    const readState = useReadOnOpen(isDataReady ? page?.read : undefined);
    const isWaitingForRead = !!page?.read && !page.read.isLoaded;

    // A handler is running: a second submit is ignored and the redirect waits, because the data changes under it
    const isHandlingRef = useRef(false);

    // The position that a handler navigated away from. The screen keeps it until the new URL arrives or it is focused again.
    const leftPositionKeyRef = useRef<string | undefined>(undefined);

    // The position that the focused screen shows, kept for handlers that resume after a request. It is undefined once the
    // screen is blurred or unmounted, so a request that settles after the user left never moves them.
    const shownPositionKeyRef = useRef<string | undefined>(undefined);

    // After a draft write or a request the plan of the last render is stale, so handlers rebuild it from what Onyx holds now
    const rebuildPlan = async () => flow.buildPlan(await readData(), context);

    // The status of the last render belongs to the request of the open page, which may not be the request the handler
    // sends, and it may be stale. A handler reads the status of its own request before it sends it again.
    const isRequestPending = async (key: RequestKey) => {
        const requests = await Onyx.get(ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_REQUESTS);
        return requests?.[key]?.status === 'pending';
    };

    /** Navigates away from the page that started the handler, unless the user already left it while the handler waited */
    const leavePosition = (from: FlowPosition, navigate: () => void) => {
        const fromKey = getPositionKey(from);
        if (shownPositionKeyRef.current !== fromKey) {
            return;
        }
        leftPositionKeyRef.current = fromKey;
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
     * flow stays on the page: while the request is pending or after it failed.
     */
    const runPageRequest = async (from: FlowPosition, currentPlan: FlowPlan<TVocabulary>): Promise<FlowPlan<TVocabulary> | undefined> => {
        const currentStep = findStep(currentPlan, from.stepID);
        const submittedPage = currentStep ? findPage(currentStep, from.pageID) : undefined;
        const request = submittedPage?.request;
        if (!request?.send) {
            return currentPlan;
        }
        if (await isRequestPending(request.key)) {
            return undefined;
        }
        const outcome = await request.send();
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
        const request = finishedStep.request;
        if (request?.send) {
            if (await isRequestPending(request.key)) {
                return;
            }
            const outcome = await request.send();
            if (outcome.status !== 'succeeded') {
                return;
            }
            await flow.clearDraftInputs?.(getStepInputIDsToClear(finishedStep));
        }
        const nextPlan = await rebuildPlan();
        const nextPosition = getNextStepPosition(nextPlan, currentPlan, from.stepID);
        leavePosition(from, () => (nextPosition ? goToPosition(routes, nextPosition) : routes.exit()));
    };

    const submitPage = (values: OnboardingDraft) => {
        // A custom page that is not ready yet, such as Plaid before an account is picked, has nothing to submit
        if (!position || !page || (page.kind === 'custom' && page.canComplete === false)) {
            return;
        }
        const from = position;
        const submittedPage = page;
        runHandler(async () => {
            const transition = submittedPage.onSubmit?.(values) ?? {};
            const draftUpdate = transition.draftUpdate ?? values;
            if (!isEmptyObject(draftUpdate)) {
                await flow.saveDraft(draftUpdate);
            }
            const nextPlan = await runPageRequest(from, await rebuildPlan());
            if (!nextPlan) {
                return;
            }
            const editReturnPosition = from.isEditing ? getEditReturnPosition(nextPlan, from) : undefined;
            if (editReturnPosition) {
                leavePosition(from, () => goBackToPosition(routes, editReturnPosition));
                return;
            }
            const nextPosition = getPositionAfterSubmit(nextPlan, from, transition);
            if (nextPosition) {
                leavePosition(from, () => goToPosition(routes, nextPosition));
                return;
            }
            await finishStep(from, nextPlan);
        });
    };

    // The error of a failed request belongs to the visit that saw it fail. The status entry outlives the page, so without
    // this the user who leaves to correct an answer would find the old error on the page when they come back.
    const clearShownRequestError = () => {
        if (!pageRequestKey || !requestState.errors) {
            return;
        }
        clearRequestState(pageRequestKey);
    };

    const goBack = () => {
        clearShownRequestError();
        if (!position || !page) {
            routes.exit();
            return;
        }
        if (page.shouldExitOnBack) {
            routes.exit();
            return;
        }
        const previousPosition = getPreviousPosition(plan, position);
        if (!previousPosition) {
            goBackToEntry(routes);
            return;
        }
        goBackToPosition(routes, previousPosition);
    };

    const editPage = (pageID: string) => {
        if (!position) {
            return;
        }
        clearShownRequestError();
        goToPosition(routes, {stepID: position.stepID, pageID, isEditing: true});
    };

    const pressRow = (rowID: string) => {
        if (!position || page?.kind !== 'list' || !page.onRowPress) {
            return;
        }
        const from = position;
        const transition = page.onRowPress(rowID);
        runHandler(async () => {
            if (transition.draftUpdate) {
                await flow.saveDraft(transition.draftUpdate);
            }
            const nextPageID = transition.nextPageID;
            if (!nextPageID) {
                return;
            }
            clearShownRequestError();
            leavePosition(from, () => goToPosition(routes, {stepID: from.stepID, pageID: nextPageID, isEditing: !!transition.isEditing}));
        });
    };

    const goToStep = (stepID: TVocabulary['stepID']) => {
        const stepPosition = getStepFirstPosition(plan, stepID);
        if (!stepPosition) {
            return;
        }
        clearShownRequestError();
        goToPosition(routes, stepPosition);
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
        replacePosition(routes, resumePosition);
    });

    useEffect(() => {
        shownPositionKeyRef.current = isFocused ? urlPositionKey : undefined;
        return () => {
            shownPositionKeyRef.current = undefined;
        };
    }, [isFocused, urlPositionKey]);

    useEffect(() => {
        if (!isFocused) {
            return;
        }
        // The screen is shown again, so the URL it left is the one the user came back to
        leftPositionKeyRef.current = undefined;
    }, [isFocused]);

    // The only navigation outside a handler: a deep link, a stale URL or a URL without a page has no page to show, so
    // the screen swaps it for the position where the flow resumes. It waits while a handler runs or has just left this
    // URL, because the data then changes before the navigation lands, and it redirects one URL only once. A plan built
    // before the account of the workspace was read would send a deep link back to the first step, so it waits for the read too.
    useEffect(() => {
        if (!isUnreachable || !isFocused || !isDataReady) {
            return;
        }
        redirectToResume();
    }, [isUnreachable, isFocused, isDataReady, urlPositionKey]);

    return {
        data,
        context,
        plan,
        position,
        step,
        page,
        isSubmitting: requestState.isPending,
        canSubmitOffline: !pageRequestKey,
        errorText: getLatestErrorMessage({errors: requestState.errors}),
        isWaitingForRead,
        hasReadFailed: isWaitingForRead && readState.hasFailed,
        submitPage,
        goBack,
        editPage,
        pressRow,
        goToStep,
    };
}

export default useOnboardingFlow;
export type {OnboardingFlow};
