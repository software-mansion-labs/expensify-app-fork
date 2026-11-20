/**
 * Pure navigation over a flow definition. The flow pages, the entry page and the tests use these functions, so the order
 * of the steps and the skip rules live only in the definitions.
 */
import type {FlowContext, FlowDefinition, FlowDirection, FlowPosition, StepDefinition} from './types';

function isStepApplicable<TPageName extends string>(step: StepDefinition<TPageName>, context: FlowContext): boolean {
    return step.isApplicable?.(context) ?? true;
}

function getApplicableSteps<TPageName extends string>(flow: FlowDefinition<TPageName>, context: FlowContext): Array<StepDefinition<TPageName>> {
    return flow.filter((step) => isStepApplicable(step, context));
}

/** Returns the step of a page name. An unknown page falls back to the first step, the way the URL of the flow is read. */
function findStep<TPageName extends string>(flow: FlowDefinition<TPageName>, pageName: string | undefined): StepDefinition<TPageName> {
    return flow.find((step) => step.id === pageName) ?? flow[0];
}

/** Returns the nearest applicable step after the given one. Undefined means that the flow is done. */
function getNextStep<TPageName extends string>(flow: FlowDefinition<TPageName>, context: FlowContext, pageName: TPageName): StepDefinition<TPageName> | undefined {
    const index = flow.findIndex((step) => step.id === pageName);
    return flow.slice(index + 1).find((step) => isStepApplicable(step, context));
}

/** Returns the nearest applicable step before the given one. Undefined means that going back leaves the flow. */
function getPreviousStep<TPageName extends string>(flow: FlowDefinition<TPageName>, context: FlowContext, pageName: TPageName): StepDefinition<TPageName> | undefined {
    const index = flow.findIndex((step) => step.id === pageName);
    return flow.slice(0, Math.max(index, 0)).findLast((step) => isStepApplicable(step, context));
}

function getEntryPosition<TPageName extends string>(step: StepDefinition<TPageName>, context: FlowContext, direction: FlowDirection): FlowPosition<TPageName> {
    return {page: step.id, subPage: step.getEntrySubPage?.(context, direction)};
}

/** Returns the first applicable step that is not complete. A flow with every step complete resumes on its last step. */
function getResumeStep<TPageName extends string>(flow: FlowDefinition<TPageName>, context: FlowContext): StepDefinition<TPageName> {
    const applicableSteps = getApplicableSteps(flow, context);
    return applicableSteps.find((step) => !step.isComplete(context)) ?? applicableSteps.at(-1) ?? flow[0];
}

function getResumePosition<TPageName extends string>(flow: FlowDefinition<TPageName>, context: FlowContext): FlowPosition<TPageName> {
    return getEntryPosition(getResumeStep(flow, context), context, 'resume');
}

/** Returns the names of the step counter of the header: one per position that an applicable step holds */
function getHeaderStepNames<TPageName extends string>(flow: FlowDefinition<TPageName>, context: FlowContext): string[] {
    const positions = new Set(getApplicableSteps(flow, context).flatMap((step) => (step.headerPosition === undefined ? [] : [step.headerPosition])));
    return Array.from({length: positions.size}, (_, index) => String(index + 1));
}

/** Returns true when the step is applicable and does not come after the resume position, which is what the URL guard allows */
function canOpen<TPageName extends string>(flow: FlowDefinition<TPageName>, context: FlowContext, pageName: string | undefined): boolean {
    const applicableSteps = getApplicableSteps(flow, context);
    const stepIndex = applicableSteps.findIndex((step) => step.id === pageName);
    const resumeIndex = applicableSteps.indexOf(getResumeStep(flow, context));
    return stepIndex !== -1 && stepIndex <= resumeIndex;
}

export {canOpen, findStep, getApplicableSteps, getEntryPosition, getHeaderStepNames, getNextStep, getPreviousStep, getResumePosition};
