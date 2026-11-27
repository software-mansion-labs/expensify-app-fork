/**
 * The step order of a flow: which step a URL opens, which step a flow resumes at, the steps around a step, and the
 * counter of a step.
 *
 * What it hides: the skip and completion rules of the order and the counter arithmetic.
 */
import type {StepID} from '@pages/SimplifiedBankOnboarding/contract/ids';

import type React from 'react';

/**
 * 'own' (default): the step takes the next number of the counter.
 * 'shared': the step shows the number of the step before it.
 * 'none': the step shows no counter.
 * A skipped step takes no number. The counter labels are '1', '2', ... up to the number of 'own' steps that are not skipped.
 */
type FlowStepCounter = 'own' | 'shared' | 'none';

/** One step of a flow. OnboardingFlow gets the steps in flow order and renders the content of the step that the URL names. */
type FlowStepConfig = {
    id: StepID;

    /**
     * Whether the saved data says that the user finished the step. A flow that opens without a step in the URL opens
     * the first step that is neither skipped nor complete. A complete step stays open to a URL that names it.
     */
    isComplete: boolean;

    /** Back passes over a skipped step, and its URL opens the next step that is not skipped. Default: false. */
    skip?: boolean;

    /** Default: 'own' */
    counter?: FlowStepCounter;

    /** The content of the step, normally a component that renders OnboardingStep */
    content: React.ReactNode;
};

type StepCounter = {
    /** 0-based position of the step in the counter */
    index: number;

    /** The labels '1' to 'N', one for each counted step */
    names: string[];
};

function isShown(step: FlowStepConfig): boolean {
    return !step.skip;
}

function findNextShownStep(steps: FlowStepConfig[], fromIndex: number): FlowStepConfig | undefined {
    return steps.slice(Math.max(fromIndex, 0)).find(isShown);
}

/** The step that a flow opens without a step in the URL: the first one that is neither skipped nor complete, else the last one that is not skipped */
function getResumeStep(steps: FlowStepConfig[]): FlowStepConfig | undefined {
    const shownSteps = steps.filter(isShown);
    return shownSteps.find((step) => !step.isComplete) ?? shownSteps.at(-1);
}

/**
 * The step that a URL step opens: itself, the next step that is not skipped when it is skipped, else the resume step.
 * A last step that is skipped is a mistake of the flow page, because Next of the step before it would open no step, so
 * it throws in development.
 */
function resolveFlowStep(steps: FlowStepConfig[], urlStep: StepID | undefined): FlowStepConfig | undefined {
    if (__DEV__ && steps.at(-1)?.skip) {
        throw new Error('OnboardingFlow: the last step cannot be skipped, because Next of the step before it would open no step');
    }

    const urlStepIndex = steps.findIndex((step) => step.id === urlStep);
    const stepOfURL = urlStepIndex >= 0 ? findNextShownStep(steps, urlStepIndex) : undefined;
    return stepOfURL ?? getResumeStep(steps);
}

/**
 * The steps around `stepID`. The previous one is the nearest step before it that is not skipped. The next one is the
 * next step of the list, skipped or not: the answer of a request can change the skip rules after the step read them,
 * so Next opens the next URL and the flow resolves a skipped step there, with the data of that moment.
 */
function getAdjacentSteps(steps: FlowStepConfig[], stepID: StepID): {previousStep: StepID | undefined; nextStep: StepID | undefined} {
    const stepIndex = steps.findIndex((step) => step.id === stepID);
    if (stepIndex < 0) {
        return {previousStep: undefined, nextStep: undefined};
    }
    const previousStep = steps.slice(0, stepIndex).reverse().find(isShown);
    return {previousStep: previousStep?.id, nextStep: steps.at(stepIndex + 1)?.id};
}

/** The counter of `stepID`, or undefined when the step shows none */
function getStepCounter(steps: FlowStepConfig[], stepID: StepID): StepCounter | undefined {
    const shownSteps = steps.filter(isShown);
    const isOwnCounter = (step: FlowStepConfig) => (step.counter ?? 'own') === 'own';
    const ownStepCount = shownSteps.filter(isOwnCounter).length;
    const stepIndex = shownSteps.findIndex((step) => step.id === stepID);
    const step = shownSteps.at(stepIndex);
    if (stepIndex < 0 || !step || step.counter === 'none' || ownStepCount === 0) {
        return undefined;
    }

    const ownStepsUpToStep = shownSteps.slice(0, stepIndex + 1).filter(isOwnCounter).length;
    return {
        index: Math.max(ownStepsUpToStep - 1, 0),
        names: Array.from({length: ownStepCount}, (_, index) => String(index + 1)),
    };
}

export {getAdjacentSteps, getStepCounter, resolveFlowStep};
export type {FlowStepConfig, FlowStepCounter, StepCounter};
