import type {InputID, OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {OnboardingFormID} from '@pages/SimplifiedBankOnboarding/contract/formID';
import type {FlowPlan, FlowVocabulary, PlanContext} from '@pages/SimplifiedBankOnboarding/core/plan/types';

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

/** What makes a flow: its form and its plan, whose custom pages render their own screens. The controller knows nothing else about it. */
type FlowDescriptor<TData, TVocabulary extends FlowVocabulary = FlowVocabulary> = {
    /** The ID of the step wrapper, which tells the screens apart in tests and logs */
    wrapperID: string;

    /** The form that the form pages render */
    formID: OnboardingFormID;

    /** Writes the submitted values to the draft of that form */
    saveDraft: (values: OnboardingDraft) => Promise<void>;

    /** Removes inputs from that draft after the server saved them. A flow that leaves after its only request needs none. */
    clearDraftInputs?: (inputIDs: InputID[]) => Promise<void>;

    buildPlan: (data: TData, context: PlanContext) => FlowPlan<TVocabulary>;
};

export type {FlowDataSource, FlowDataStatus, FlowDescriptor};
