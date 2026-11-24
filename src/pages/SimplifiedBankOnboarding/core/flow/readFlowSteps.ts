/**
 * Reads the FlowStep children of OnboardingFlow and answers the questions about the step order: which step a URL
 * opens, the steps before and after one that are not skipped, and the counter of a step.
 *
 * What it hides: the flattening of fragments and arrays, the runtime check of the element props, the skip rules of the
 * order and the counter arithmetic.
 */
import {isStepID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import type {StepID} from '@pages/SimplifiedBankOnboarding/contract/ids';

import type React from 'react';

import {Fragment, isValidElement} from 'react';

import type {FlowStepCounter} from './FlowStep';

import FlowStep from './FlowStep';

type FlowStepEntry = {
    id: StepID;
    component: React.ComponentType;
    skip: boolean;
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

function isComponent(value: unknown): value is React.ComponentType {
    return typeof value === 'function' || (typeof value === 'object' && value !== null && '$$typeof' in value);
}

function isFlowStepCounter(value: unknown): value is FlowStepCounter {
    return value === 'own' || value === 'shared' || value === 'none';
}

/** The FlowStep children in flow order. Other children and FlowStep elements with invalid props are ignored. */
function readFlowSteps(children: React.ReactNode): FlowStepEntry[] {
    return flattenElements(children).flatMap((child): FlowStepEntry[] => {
        const props = child.props;
        if (child.type !== FlowStep || typeof props !== 'object' || props === null || !('id' in props) || !('component' in props)) {
            return [];
        }
        const {id, component} = props;
        const skip = 'skip' in props ? props.skip : undefined;
        const counter = 'counter' in props ? props.counter : undefined;
        if (typeof id !== 'string' || !isStepID(id) || !isComponent(component)) {
            return [];
        }
        return [{id, component, skip: skip === true, counter: isFlowStepCounter(counter) ? counter : 'own'}];
    });
}

function findNextShownStep(steps: FlowStepEntry[], fromIndex: number): FlowStepEntry | undefined {
    return steps.slice(Math.max(fromIndex, 0)).find((step) => !step.skip);
}

/** The step that a URL step opens: itself, or its replacement when it is missing, unknown or skipped */
function resolveFlowStep(steps: FlowStepEntry[], urlStep: StepID | undefined, resumeAt: StepID | undefined): FlowStepEntry | undefined {
    const urlStepIndex = steps.findIndex((step) => step.id === urlStep);
    const resumeIndex = steps.findIndex((step) => step.id === resumeAt);
    const resumeStep = resumeIndex >= 0 ? findNextShownStep(steps, resumeIndex) : undefined;
    const firstStep = findNextShownStep(steps, 0);

    if (urlStepIndex >= 0) {
        return findNextShownStep(steps, urlStepIndex) ?? resumeStep ?? firstStep;
    }
    return resumeStep ?? firstStep;
}

/** The steps before and after `stepID` that are not skipped */
function getAdjacentSteps(steps: FlowStepEntry[], stepID: StepID): {previousStep: StepID | undefined; nextStep: StepID | undefined} {
    const stepIndex = steps.findIndex((step) => step.id === stepID);
    if (stepIndex < 0) {
        return {previousStep: undefined, nextStep: undefined};
    }
    const previousStep = steps
        .slice(0, stepIndex)
        .reverse()
        .find((step) => !step.skip);
    return {previousStep: previousStep?.id, nextStep: findNextShownStep(steps, stepIndex + 1)?.id};
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
