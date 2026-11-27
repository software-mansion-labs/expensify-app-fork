import type {StepConfig} from './types';

/** What the step counter of the header shows for the open step */
type StepCounter = {
    /** The position of the step in the counter, starting at 0 */
    index: number;

    /** The labels '1' to 'N' that the header shows, one for each step of the plan that counts on its own */
    stepNames: string[];
};

function isCountedOnItsOwn(step: StepConfig): boolean {
    return (step.counter ?? 'own') === 'own';
}

/**
 * The counter of the header for a step, derived from the order of the steps in the plan. A step that the plan leaves
 * out takes no number, so an optional step changes the total only while it is in the plan. Undefined when the step
 * shows no counter.
 */
function getStepCounter(steps: StepConfig[], stepID: string): StepCounter | undefined {
    const stepIndex = steps.findIndex((step) => step.id === stepID);
    const countedStepCount = steps.filter(isCountedOnItsOwn).length;
    if (stepIndex < 0 || steps.at(stepIndex)?.counter === 'none' || countedStepCount === 0) {
        return undefined;
    }

    const countedStepsUpToStep = steps.slice(0, stepIndex + 1).filter(isCountedOnItsOwn).length;

    return {
        // A shared step before any counted step has no number to share, so it shows the first one
        index: Math.max(countedStepsUpToStep - 1, 0),
        stepNames: Array.from({length: countedStepCount}, (_, index) => String(index + 1)),
    };
}

export default getStepCounter;
export type {StepCounter};
