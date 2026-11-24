import type {StepID} from '@pages/SimplifiedBankOnboarding/contract/ids';

import type React from 'react';

type FlowStepCounter = 'own' | 'shared' | 'none';

/* eslint-disable react/no-unused-prop-types -- OnboardingFlow reads these props from the element, the marker never renders them */
type FlowStepProps = {
    id: StepID;

    /** A component with no props. It normally renders OnboardingStep. */
    component: React.ComponentType;

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

/** Marks one step in the children of OnboardingFlow. It renders nothing by itself: OnboardingFlow reads its props. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- OnboardingFlow reads the props from the element, the marker itself never uses them
function FlowStep(props: FlowStepProps): null {
    return null;
}

export default FlowStep;
export type {FlowStepCounter, FlowStepProps};
