/**
 * A position in a plan: the step, the page of the step and whether the page is opened from the confirmation of the
 * step. The URL holds it, so the helpers here only look positions up and compare them. They know nothing of a flow.
 */
import type {FlowPlan, PageConfig, PageID, StepConfig, StepID} from '@pages/SimplifiedBankOnboarding/core/plan/types';

type FlowPosition = {
    stepID: StepID;
    pageID: PageID;
    isEditing: boolean;
};

type PositionIndex = {
    stepIndex: number;
    pageIndex: number;
};

function getPagePosition(step: StepConfig, page: PageConfig, isEditing = false): FlowPosition {
    return {stepID: step.id, pageID: page.id, isEditing};
}

function findStep(plan: FlowPlan, stepID: StepID): StepConfig | undefined {
    return plan.steps.find((step) => step.id === stepID);
}

function findPage(step: StepConfig, pageID: PageID): PageConfig | undefined {
    return step.pages.find((page) => page.id === pageID);
}

/** Undefined when the plan has no such step or the step has no such page */
function getPositionIndex(plan: FlowPlan, position: FlowPosition): PositionIndex | undefined {
    const stepIndex = plan.steps.findIndex((step) => step.id === position.stepID);
    const step = plan.steps.at(stepIndex);
    if (stepIndex < 0 || !step) {
        return undefined;
    }
    const pageIndex = step.pages.findIndex((page) => page.id === position.pageID);
    if (pageIndex < 0) {
        return undefined;
    }
    return {stepIndex, pageIndex};
}

/** Negative when the first position comes earlier in the plan, positive when it comes later */
function comparePositionIndexes(first: PositionIndex, second: PositionIndex): number {
    if (first.stepIndex !== second.stepIndex) {
        return first.stepIndex - second.stepIndex;
    }
    return first.pageIndex - second.pageIndex;
}

export {comparePositionIndexes, findPage, findStep, getPagePosition, getPositionIndex};
export type {FlowPosition, PositionIndex};
