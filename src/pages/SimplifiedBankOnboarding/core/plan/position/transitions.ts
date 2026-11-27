/**
 * The moves between positions of a plan. Each helper returns the position to open, or undefined when the move leaves
 * the step or the flow, so the caller decides what leaving means. Skipped pages are not in the plan, so no helper here
 * has to know which pages a flow skips.
 */
import type {FlowPlan, FlowVocabulary, PageTransition, StepConfig} from '@pages/SimplifiedBankOnboarding/core/plan/types';

import type {FlowPosition} from './position';

import {findPage, findStep, getPagePosition} from './position';

function getStepFirstPosition(plan: FlowPlan, stepID: string): FlowPosition | undefined {
    const step = findStep(plan, stepID);
    const page = step?.pages.at(0);
    if (!step || !page) {
        return undefined;
    }
    return getPagePosition(step, page);
}

function getFirstPosition(plan: FlowPlan): FlowPosition | undefined {
    const step = plan.steps.at(0);
    return step ? getStepFirstPosition(plan, step.id) : undefined;
}

function getStepLastPosition<TVocabulary extends FlowVocabulary>(step: StepConfig<TVocabulary>): FlowPosition<TVocabulary> | undefined {
    const page = step.pages.at(-1);
    return page ? getPagePosition(step, page) : undefined;
}

function getStepPagePosition(plan: FlowPlan, stepID: string, pageID: string, isEditing = false): FlowPosition | undefined {
    const step = findStep(plan, stepID);
    const page = step ? findPage(step, pageID) : undefined;
    if (!step || !page) {
        return undefined;
    }
    return getPagePosition(step, page, isEditing);
}

/** The page after the current one in the same step. Undefined at the end of the step. */
function getFollowingPagePosition(plan: FlowPlan, position: FlowPosition): FlowPosition | undefined {
    const step = findStep(plan, position.stepID);
    if (!step) {
        return undefined;
    }
    const pageIndex = step.pages.findIndex((page) => page.id === position.pageID);
    const page = pageIndex < 0 ? undefined : step.pages.at(pageIndex + 1);
    return page ? getPagePosition(step, page) : undefined;
}

/**
 * Where a page opened from the confirmation goes back to: the first confirmation page after it in the step, else the
 * last page of the step. Undefined when that is the page itself.
 */
function getEditReturnPosition(plan: FlowPlan, position: FlowPosition): FlowPosition | undefined {
    const step = findStep(plan, position.stepID);
    if (!step) {
        return undefined;
    }
    const pageIndex = step.pages.findIndex((page) => page.id === position.pageID);
    const laterPages = step.pages.slice(pageIndex + 1);
    const page = laterPages.find((laterPage) => laterPage.kind === 'confirmation') ?? laterPages.at(-1);
    return page ? getPagePosition(step, page) : undefined;
}

/**
 * The page after a submit outside edit mode, where `getEditReturnPosition` decides. Undefined means that the step is
 * done and its request runs.
 */
function getPositionAfterSubmit(plan: FlowPlan, position: FlowPosition, transition: PageTransition): FlowPosition | undefined {
    if (transition.nextPageID) {
        const nextPosition = getStepPagePosition(plan, position.stepID, transition.nextPageID, transition.isEditing);
        if (nextPosition) {
            return nextPosition;
        }
    }
    return getFollowingPagePosition(plan, position);
}

/** The page that Back opens. Undefined means that Back leaves the flow for the entry page. */
function getPreviousPosition(plan: FlowPlan, position: FlowPosition): FlowPosition | undefined {
    if (position.isEditing) {
        const editReturnPosition = getEditReturnPosition(plan, position);
        if (editReturnPosition) {
            return editReturnPosition;
        }
    }
    const stepIndex = plan.steps.findIndex((step) => step.id === position.stepID);
    const step = plan.steps.at(stepIndex);
    if (stepIndex < 0 || !step) {
        return undefined;
    }
    const pageIndex = step.pages.findIndex((page) => page.id === position.pageID);
    const page = step.pages.at(pageIndex);
    if (pageIndex < 0 || !page) {
        return undefined;
    }
    if (page.previousPageID) {
        const previousPosition = getStepPagePosition(plan, step.id, page.previousPageID);
        if (previousPosition) {
            return previousPosition;
        }
    }
    const previousPage = pageIndex > 0 ? step.pages.at(pageIndex - 1) : undefined;
    if (previousPage) {
        return getPagePosition(step, previousPage);
    }
    const previousStep = stepIndex > 0 ? plan.steps.at(stepIndex - 1) : undefined;
    return previousStep ? getStepLastPosition(previousStep) : undefined;
}

/**
 * The first page of the step after a finished step. The request of the step can change which steps the plan holds, so
 * the step is looked up in the plan from before the request when the new plan no longer has it. Undefined means that
 * the flow is done.
 */
function getNextStepPosition(plan: FlowPlan, previousPlan: FlowPlan, stepID: string): FlowPosition | undefined {
    const previousStepIndex = previousPlan.steps.findIndex((step) => step.id === stepID);
    const anchorStepIDs = previousPlan.steps
        .slice(0, previousStepIndex + 1)
        .map((step) => step.id)
        .reverse();
    const anchorStepID = anchorStepIDs.find((id) => !!findStep(plan, id));
    const anchorIndex = anchorStepID ? plan.steps.findIndex((step) => step.id === anchorStepID) : -1;
    const nextStep = plan.steps.at(anchorIndex + 1);
    return nextStep ? getStepFirstPosition(plan, nextStep.id) : undefined;
}

export {
    getEditReturnPosition,
    getFirstPosition,
    getFollowingPagePosition,
    getNextStepPosition,
    getPositionAfterSubmit,
    getPreviousPosition,
    getStepFirstPosition,
    getStepLastPosition,
    getStepPagePosition,
};
