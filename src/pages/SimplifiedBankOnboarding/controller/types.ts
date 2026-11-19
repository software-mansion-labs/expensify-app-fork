import type {CustomPageConfig, FlowPlan, PlanContext, StepID} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import type {OnboardingFormID} from '@pages/SimplifiedBankOnboarding/formConfig/validation/types';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/types/form';
import type {BankFields, OnboardingAccount, OnboardingPicklists, Workspaces} from '@pages/SimplifiedBankOnboarding/types/onyx';

import type {ReactNode} from 'react';
import type {OnyxEntry} from 'react-native-onyx';

/** The Onyx values that a plan is built from. A flow reads the ones it needs, such as the server lists of the NonUSD flow. */
type FlowData = {
    draft: OnboardingDraft | undefined;
    account: OnyxEntry<OnboardingAccount>;

    /** The currency of a workspace decides the NonUSD steps */
    workspaces: OnyxEntry<Workspaces>;

    /** The bank inputs that the server describes for a country */
    bankFields: OnyxEntry<BankFields>;
    picklists: OnyxEntry<OnboardingPicklists>;
};

/**
 * The data that a screen renders and a read of the same keys for its handlers. After a write the data of the last render
 * is stale, so a handler reads it again before it builds the next plan.
 */
type FlowDataSource<TData> = {
    data: TData;
    readData: () => Promise<TData>;
};

/**
 * Whether the plan can be built yet. A deep link may open a flow before the account of its workspace was read, and a
 * plan built from missing data would send the user back to the first step.
 */
type FlowDataStatus = 'ready' | 'loading' | 'notFound';

/** What a custom step gets from the controller. A custom step never navigates: it reports through these callbacks. */
type CustomStepProps = {
    page: CustomPageConfig;

    /** The workspace of the flow */
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

/** What makes a flow: its form, its plan, its header and its custom steps. The controller knows nothing else about it. */
type FlowDescriptor<TData> = {
    /** The ID of the step wrapper, which tells the screens apart in tests and logs */
    wrapperID: string;

    /** The form that the form pages render */
    formID: OnboardingFormID;

    /** Writes the submitted values to the draft of that form */
    saveDraft: (values: OnboardingDraft) => Promise<void>;

    /** The names of the step counter of the header */
    getStepNames: (data: TData, context: PlanContext) => readonly string[];
    buildPlan: (data: TData, context: PlanContext) => FlowPlan;
    renderCustomStep: (props: CustomStepProps) => ReactNode;
};

export type {CustomStepProps, FlowData, FlowDataSource, FlowDataStatus, FlowDescriptor};
