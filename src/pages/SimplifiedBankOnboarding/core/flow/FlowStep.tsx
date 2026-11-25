import type {StepID} from '@pages/SimplifiedBankOnboarding/contract/ids';

import type React from 'react';

type FlowStepCounter = 'own' | 'shared' | 'none';

/* eslint-disable react/no-unused-prop-types -- OnboardingFlow reads these props from the element to order the steps, FlowStep renders only its children */
type FlowStepProps = {
    id: StepID;

    /** The content of the step, normally a component that renders OnboardingStep */
    children: React.ReactNode;

    /**
     * Whether the saved data says that the user finished the step. A flow that opens without a step in the URL opens
     * the first step that is neither skipped nor complete. A complete step stays open to a URL that names it.
     */
    isComplete: boolean;

    /** Back passes over a skipped step, and its URL opens the next step that is not skipped. */
    skip?: boolean;

    /**
     * 'own' (default): the step takes the next number of the counter.
     * 'shared': the step shows the number of the step before it.
     * 'none': the step shows no counter.
     * A skipped step takes no number. The counter labels are '1', '2', ... up to the number of 'own' steps that are not skipped.
     */
    counter?: FlowStepCounter;
};
/* eslint-enable react/no-unused-prop-types */

/**
 * One step in the children of OnboardingFlow. OnboardingFlow reads the props of every step to order them and renders
 * only the step that the URL names, so the component itself renders only its children.
 */
function FlowStep({children}: FlowStepProps) {
    return children;
}

export default FlowStep;
export type {FlowStepCounter, FlowStepProps};
