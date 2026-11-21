/**
 * The shape of a flow: a plan of steps, each step a list of pages. The builders in `formConfig/` produce it from the
 * answers, the controller walks it and `form/` renders one page of it. A form page is only a list of fields from
 * `form/fields`, and labels are already translated, so the renderer needs no knowledge of the flow.
 */
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {Field, SummaryRow} from '@pages/SimplifiedBankOnboarding/form/fields/types';
import type {PlannedRequest} from '@pages/SimplifiedBankOnboarding/requests/types';
import type {BooleanInputID, OnboardingDraft} from '@pages/SimplifiedBankOnboarding/types/form';

import type {PageID, StepID} from './ids';

/** What happens after a page: the draft values to save and the page to show next */
type PageTransition = {
    /** Defaults to the values that the page submitted */
    draftUpdate?: OnboardingDraft;

    /** Defaults to the following page of the step, or to the end of the step */
    nextPageID?: PageID;

    /** Opens the next page in edit mode, so its submit returns to the confirmation of the step */
    isEditing?: boolean;
};

type PageBase = {
    id: PageID;

    /**
     * The page already holds a valid answer. The flow resumes at the first page that does not. A page that only edits
     * a buffer or shows a summary counts as complete, so it never stops the flow from moving past it.
     */
    isComplete: boolean;

    /** Back leaves the flow instead of opening the previous page, like the test deposit form of the USD flow */
    shouldExitOnBack?: boolean;

    /** Decides the transition from the submitted values. Without it the controller saves the values and goes on. */
    onSubmit?: (values: OnboardingDraft) => PageTransition;

    /** Defaults to the preceding page, or to the last page of the previous step */
    previousPageID?: PageID;

    /** The server data that describes the page did not arrive yet, such as the bank inputs of a country */
    isLoading?: boolean;

    /**
     * A request that saves the answers of the page before the next page opens, for a step that talks to the server in
     * the middle, such as the director details before the emails of the other directors. It runs after the draft write.
     */
    request?: PlannedRequest;
};

type FormPageConfig = PageBase & {
    kind: 'form';
    title: string;
    description?: string;

    /** The page renders, validates and submits them, and the plan counts the page as complete when the answers pass them */
    fields: Field[];

    /** Defaults to "Next", or to "Confirm" in edit mode */
    submitLabel?: string;
};

/** A yes or no question saved to one boolean input */
type QuestionPageConfig = PageBase & {
    kind: 'question';
    fieldID: BooleanInputID;
    title: string;
    description: string;
    defaultValue: boolean;
};

/** A row of a confirmation page, which opens the page that edits its value */
type ConfirmationRow = SummaryRow & {
    editPageID: PageID;
};

/** Sums up the form pages that precede it in its step, so it lists no rows of its own */
type ConfirmationPageConfig = PageBase & {
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

type ListPageConfig = PageBase & {
    kind: 'list';
    title: string;
    description?: string;

    /** The heading above the rows */
    rowsTitle?: string;
    rows: ListRow[];

    /** Decides where a row press leads */
    onRowPress?: (rowID: string) => PageTransition;
};

/** The pages that are not forms. Each one is a screen of `steps/`, picked by name. */
type CustomStepName = 'plaid' | 'onfido' | 'hangTight' | 'validation' | 'finish';

type CustomPageConfig = PageBase & {
    kind: 'custom';
    component: CustomStepName;

    /** False while the page waits for an input it does not have yet, such as the account picked in Plaid or the other directors. Defaults to true. */
    canComplete?: boolean;
};

type PageConfig = FormPageConfig | QuestionPageConfig | ConfirmationPageConfig | ListPageConfig | CustomPageConfig;

type StepConfig = {
    id: StepID;
    title: string;

    /** The position of the step in the step counter of the header. Undefined hides the counter. */
    counterIndex?: number;

    /** Skipped pages are left out, so the transitions never special-case them */
    pages: PageConfig[];

    /** Used to find the step where the flow resumes */
    isComplete: boolean;

    /** The request that runs after the last page of the step, which shows its pending state and its error */
    request?: PlannedRequest;
};

type FlowPlan = {
    steps: StepConfig[];

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
    CustomStepName,
    FlowPlan,
    FormPageConfig,
    ListPageConfig,
    ListRow,
    PageConfig,
    PageID,
    PageTransition,
    PlanContext,
    QuestionPageConfig,
    StepConfig,
    StepID,
};
