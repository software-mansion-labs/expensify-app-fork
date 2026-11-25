/**
 * Reads the FlowStep children of OnboardingFlow and answers the questions about the step order: which step a URL
 * opens, which step a flow resumes at, the steps around a step, and the counter of a step.
 *
 * What it hides: the flattening of fragments and arrays, the runtime check of the element props, the skip and
 * completion rules of the order and the counter arithmetic.
 */
import {isStepID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import type {StepID} from '@pages/SimplifiedBankOnboarding/contract/ids';

import type React from 'react';

import {Fragment, isValidElement} from 'react';

import type {FlowStepCounter} from './FlowStep';

import FlowStep from './FlowStep';

type FlowStepEntry = {
    id: StepID;

    /** The FlowStep element as written, which OnboardingFlow renders when the step is shown */
    element: React.ReactElement<unknown>;
    skip: boolean;
    isComplete: boolean;
    counter: FlowStepCounter;
};

type StepCounter = {
    /** 0-based position of the step in the counter */
    index: number;

    /** The labels '1' to 'N', one for each counted step */
    names: string[];
};

/** The elements of `children` in order, with fragments and arrays opened. Text, null and booleans are dropped. */
function flattenElements(children: unknown): Array<React.ReactElement<unknown>> {
    if (Array.isArray(children)) {
        return children.flatMap((child: unknown) => flattenElements(child));
    }
    if (!isValidElement(children)) {
        return [];
    }
    if (children.type === Fragment) {
        const props: unknown = children.props;
        return typeof props === 'object' && props !== null && 'children' in props ? flattenElements(props.children) : [];
    }
    return [children];
}

function isFlowStepCounter(value: unknown): value is FlowStepCounter {
    return value === 'own' || value === 'shared' || value === 'none';
}

function readFlowStep(child: React.ReactElement<unknown>): FlowStepEntry | undefined {
    const props = child.props;
    if (child.type !== FlowStep || typeof props !== 'object' || props === null || !('id' in props)) {
        return undefined;
    }
    const {id} = props;
    const skip = 'skip' in props ? props.skip : undefined;
    const isComplete = 'isComplete' in props ? props.isComplete : undefined;
    const counter = 'counter' in props ? props.counter : undefined;
    if (typeof id !== 'string' || !isStepID(id)) {
        return undefined;
    }
    return {id, element: child, skip: skip === true, isComplete: isComplete === true, counter: isFlowStepCounter(counter) ? counter : 'own'};
}

/**
 * The FlowStep children in flow order. A child that is no valid FlowStep, and a last step that is skipped, are mistakes
 * of the flow page. They throw in development. Otherwise the child is dropped and the skipped last step is kept.
 */
function readFlowSteps(children: React.ReactNode): FlowStepEntry[] {
    const steps = flattenElements(children).flatMap((child): FlowStepEntry[] => {
        const step = readFlowStep(child);
        if (!step && __DEV__) {
            throw new Error('OnboardingFlow: every child has to be a FlowStep with a step ID');
        }
        return step ? [step] : [];
    });

    if (__DEV__ && steps.at(-1)?.skip) {
        throw new Error('OnboardingFlow: the last step cannot be skipped, because Next of the step before it would open no step');
    }
    return steps;
}

function findNextShownStep(steps: FlowStepEntry[], fromIndex: number): FlowStepEntry | undefined {
    return steps.slice(Math.max(fromIndex, 0)).find((step) => !step.skip);
}

/** The step that a flow opens without a step in the URL: the first one that is neither skipped nor complete, else the last one that is not skipped */
function getResumeStep(steps: FlowStepEntry[]): FlowStepEntry | undefined {
    const shownSteps = steps.filter((step) => !step.skip);
    return shownSteps.find((step) => !step.isComplete) ?? shownSteps.at(-1);
}

/** The step that a URL step opens: itself, the next step that is not skipped when it is skipped, else the resume step */
function resolveFlowStep(steps: FlowStepEntry[], urlStep: StepID | undefined): FlowStepEntry | undefined {
    const urlStepIndex = steps.findIndex((step) => step.id === urlStep);
    const stepOfURL = urlStepIndex >= 0 ? findNextShownStep(steps, urlStepIndex) : undefined;
    return stepOfURL ?? getResumeStep(steps);
}

/**
 * The steps around `stepID`. The previous one is the nearest step before it that is not skipped. The next one is the
 * next step of the list, skipped or not: the answer of a request can change the skip rules after the step read them,
 * so Next opens the next URL and the flow resolves a skipped step there, with the data of that moment.
 */
function getAdjacentSteps(steps: FlowStepEntry[], stepID: StepID): {previousStep: StepID | undefined; nextStep: StepID | undefined} {
    const stepIndex = steps.findIndex((step) => step.id === stepID);
    if (stepIndex < 0) {
        return {previousStep: undefined, nextStep: undefined};
    }
    const previousStep = steps
        .slice(0, stepIndex)
        .reverse()
        .find((step) => !step.skip);
    return {previousStep: previousStep?.id, nextStep: steps.at(stepIndex + 1)?.id};
}

/** The counter of `stepID`, or undefined when the step shows none */
function getStepCounter(steps: FlowStepEntry[], stepID: StepID): StepCounter | undefined {
    const shownSteps = steps.filter((step) => !step.skip);
    const ownStepCount = shownSteps.filter((step) => step.counter === 'own').length;
    const stepIndex = shownSteps.findIndex((step) => step.id === stepID);
    const step = shownSteps.at(stepIndex);
    if (stepIndex < 0 || !step || step.counter === 'none' || ownStepCount === 0) {
        return undefined;
    }

    const ownStepsUpToStep = shownSteps.slice(0, stepIndex + 1).filter((shownStep) => shownStep.counter === 'own').length;
    return {
        index: Math.max(ownStepsUpToStep - 1, 0),
        names: Array.from({length: ownStepCount}, (_, index) => String(index + 1)),
    };
}

export {flattenElements, getAdjacentSteps, getStepCounter, readFlowSteps, resolveFlowStep};
export type {FlowStepEntry, StepCounter};
