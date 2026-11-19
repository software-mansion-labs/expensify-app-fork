import type {CustomPageConfig, FlowPlan, PlanContext, StepID} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/types/form';
import type {OnboardingAccount} from '@pages/SimplifiedBankOnboarding/types/onyx';

import type {ReactNode} from 'react';
import type {OnyxEntry} from 'react-native-onyx';

/** The Onyx values that a plan is built from */
type FlowData = {
    draft: OnboardingDraft | undefined;
    account: OnyxEntry<OnboardingAccount>;
};

/** What a custom step gets from the controller. A custom step never navigates: it reports through these callbacks. */
type CustomStepProps = {
    page: CustomPageConfig;

    /** The workspace of the URL, else the workspace of the server data */
    policyID: string | undefined;

    /** The request of the step is running */
    isSubmitting: boolean;

    /** The error of the request of the step */
    errorText?: string;

    /** The page is done. The values go to the draft before the flow moves on, and the last page runs the step request. */
    onComplete: (values?: OnboardingDraft) => void;

    /** Opens the first page of another step, such as the personal info step from the review card */
    goToStep: (stepID: StepID) => void;
};

/** What makes a flow: its plan, its header and its custom steps. The controller knows nothing else about it. */
type FlowDescriptor = {
    /** The ID of the step wrapper, which tells the screens apart in tests and logs */
    wrapperID: string;

    /** The names of the step counter of the header */
    getStepNames: (data: FlowData) => readonly string[];
    buildPlan: (data: FlowData, context: PlanContext) => FlowPlan;
    renderCustomStep: (props: CustomStepProps) => ReactNode;
};

export type {CustomStepProps, FlowData, FlowDescriptor};
