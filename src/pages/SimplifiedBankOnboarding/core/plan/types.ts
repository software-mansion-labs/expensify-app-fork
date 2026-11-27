/**
 * The shape of a flow: a plan of steps, each step a list of pages. The builders in `flows/` produce it from the
 * answers, the controller walks it and `core/form/` renders one page of it. A form page is only a list of fields from
 * `core/form/fields`, and labels are already translated, so the renderer needs no knowledge of the flow.
 */
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {Field, SummaryRow} from '@pages/SimplifiedBankOnboarding/core/form/fields/types';
import type {RequestKey} from '@pages/SimplifiedBankOnboarding/core/requests/requestKey';
import type {PlannedRead, PlannedRequest} from '@pages/SimplifiedBankOnboarding/core/requests/types';

import type {ReactNode} from 'react';

/**
 * The names that a flow gives to its steps and its pages. A flow passes closed unions of its own names, so its plan
 * cannot point at a page that does not exist. The engine only compares the names, so its own code takes any vocabulary.
 */
type FlowVocabulary = {
    /** The name of a step, which the URL holds */
    stepID: string;

    /** The name of a page of a step, which the URL holds */
    pageID: string;
};

/** What happens after a page: the draft values to save and the page to show next */
type PageTransition<TVocabulary extends FlowVocabulary = FlowVocabulary> = {
    /** Defaults to the values that the page submitted */
    draftUpdate?: OnboardingDraft;

    /** Defaults to the following page of the step, or to the end of the step */
    nextPageID?: TVocabulary['pageID'];

    /** Opens the next page in edit mode, so its submit returns to the confirmation of the step */
    isEditing?: boolean;
};

type PageBase<TVocabulary extends FlowVocabulary> = {
    id: TVocabulary['pageID'];

    /**
     * The page already holds a valid answer. The flow resumes at the first page that does not. A page that only edits
     * a buffer or shows a summary counts as complete, so it never stops the flow from moving past it.
     */
    isComplete: boolean;

    /** Back leaves the flow instead of opening the previous page, like the test deposit form of the USD flow */
    shouldExitOnBack?: boolean;

    /** Decides the transition from the submitted values. Without it the controller saves the values and goes on. */
    onSubmit?: (values: OnboardingDraft) => PageTransition<TVocabulary>;

    /** Defaults to the preceding page, or to the last page of the previous step */
    previousPageID?: TVocabulary['pageID'];

    /** The server data that the page needs, such as the bank inputs of a country. The controller reads it when the page opens. */
    read?: PlannedRead;
};

/** What the controller sends when a form, confirmation or list page is submitted. A custom page sends its own request instead. */
type SubmitRequest = {
    /**
     * A request that saves the answers of the page before the next page opens, for a step that talks to the server in
     * the middle, such as the director details before the emails of the other directors. It runs after the draft write.
     */
    request?: PlannedRequest;
};

type FormPageConfig<TVocabulary extends FlowVocabulary = FlowVocabulary> = PageBase<TVocabulary> &
    SubmitRequest & {
        kind: 'form';
        title: string;
        description?: string;

        /** The page renders, validates and submits them, and the plan counts the page as complete when the answers pass them */
        fields: Field[];

        /** Defaults to "Next", or to "Confirm" in edit mode */
        submitLabel?: string;
    };

/** A row of a confirmation page, which opens the page that edits its value */
type ConfirmationRow = SummaryRow & {
    editPageID: string;
};

/** Sums up the form pages that precede it in its step, so it lists no rows of its own */
type ConfirmationPageConfig<TVocabulary extends FlowVocabulary = FlowVocabulary> = PageBase<TVocabulary> &
    SubmitRequest & {
        kind: 'confirmation';
        title: string;
    };

type ListRow = {
    id: string;
    title: string;
    description?: string;

    /** A row that cannot be opened, such as the row of the current user in the owner list */
    isReadOnly?: boolean;
};

type ListPageConfig<TVocabulary extends FlowVocabulary = FlowVocabulary> = PageBase<TVocabulary> &
    SubmitRequest & {
        kind: 'list';
        title: string;
        description?: string;

        /** The heading above the rows */
        rowsTitle?: string;
        rows: ListRow[];

        /** Decides where a row press leads */
        onRowPress?: (rowID: string) => PageTransition<TVocabulary>;
    };

/** What a custom step gets from the controller. A custom step never navigates: it reports through these callbacks. */
type CustomStepProps<TVocabulary extends FlowVocabulary = FlowVocabulary> = {
    /** The workspace of the flow */
    policyID: string | undefined;

    /** The request of the step is running */
    isSubmitting: boolean;

    /** The error of the request of the step */
    errorText?: string;

    /** The page is done. The values go to the draft before the flow moves on, and the last page runs the step request. */
    onComplete: (values?: OnboardingDraft) => void;

    /** Opens the first page of another step, such as the personal info step from the review card */
    goToStep: (stepID: TVocabulary['stepID']) => void;
};

/** A page that is not a form, but a screen of the flow. `createCustomPage` builds it from the screen and the props that only the screen needs. */
type CustomPageConfig<TVocabulary extends FlowVocabulary = FlowVocabulary> = PageBase<TVocabulary> & {
    kind: 'custom';

    /** False while the page waits for an input it does not have yet, such as the account picked in Plaid or the other directors. Defaults to true. */
    canComplete?: boolean;

    /**
     * The key of the request that the screen sends itself through `useRequest`, such as the test deposits. The controller
     * never sends it, but clears its error when the user leaves the page and blocks the page offline.
     */
    requestKey?: RequestKey;

    /** Renders the screen with what the controller provides and the props that the plan gave it */
    render: (props: CustomStepProps<TVocabulary>) => ReactNode;
};

type PageConfig<TVocabulary extends FlowVocabulary = FlowVocabulary> =
    | FormPageConfig<TVocabulary>
    | ConfirmationPageConfig<TVocabulary>
    | ListPageConfig<TVocabulary>
    | CustomPageConfig<TVocabulary>;

type StepConfig<TVocabulary extends FlowVocabulary = FlowVocabulary> = {
    id: TVocabulary['stepID'];
    title: string;

    /**
     * How the step counts in the step counter of the header, which numbers the steps in the order of the plan. 'own'
     * takes the next number, 'shared' shows the number of the step before it, such as a check that belongs to that step,
     * and 'none' hides the counter. Defaults to 'own'.
     */
    counter?: 'own' | 'shared' | 'none';

    /** Skipped pages are left out, so the transitions never special-case them */
    pages: Array<PageConfig<TVocabulary>>;

    /** Used to find the step where the flow resumes */
    isComplete: boolean;

    /** The request that runs after the last page of the step, which shows its pending state and its error */
    request?: PlannedRequest;
};

type FlowPlan<TVocabulary extends FlowVocabulary = FlowVocabulary> = {
    steps: Array<StepConfig<TVocabulary>>;

    /** The values that the fields start with and that the confirmation pages show */
    answers: OnboardingDraft;
};

/** What a plan builder needs besides the answers and the server data */
type PlanContext = {
    translate: LocalizedTranslate;

    /** The workspace of the URL. The builders fall back to the workspace of the server data without it. */
    policyID: string | undefined;
};

export type {
    ConfirmationPageConfig,
    ConfirmationRow,
    CustomPageConfig,
    CustomStepProps,
    FlowPlan,
    FlowVocabulary,
    FormPageConfig,
    ListPageConfig,
    ListRow,
    PageConfig,
    PageTransition,
    PlanContext,
    StepConfig,
};
