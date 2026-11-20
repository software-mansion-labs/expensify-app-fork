/**
 * The shape of a flow: a plan of steps, each step a list of pages. The builders in `formConfig/` produce it from the
 * answers, the controller walks it and `form/` renders one page of it. A form page holds its fields as JSX next to the
 * rules of its inputs, and labels are already translated, so the renderer needs no knowledge of the flow.
 */
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {RequestKey} from '@pages/SimplifiedBankOnboarding/requests/requestKey';
import type {RequestOutcome} from '@pages/SimplifiedBankOnboarding/requests/types';
import type {BooleanInputID, InputID, OnboardingDraft, OnboardingForm} from '@pages/SimplifiedBankOnboarding/types/form';

import type {ReactNode} from 'react';

import type {PageID, StepID} from './ids';

/**
 * Returns the translated error of a value, or undefined when the value is valid. The other values of the form are there
 * for the rules that compare two inputs, such as two emails that must differ.
 */
type FieldValidator = (value: string, values: OnboardingDraft) => string | undefined;

/** How the form page checks one of its inputs. An input is required unless it is optional. */
type InputRule = {
    isOptional?: boolean;

    /** The error of an empty required input. The generic "field required" error is shown without it. */
    requiredErrorText?: string;
};

type TextInputRule = InputRule & {
    validate?: FieldValidator;
};

/**
 * The inputs of a form page and their rules. The form validates them, submits only their values and the plan counts the
 * page as complete when the answers pass them, so the fields that the page renders must all be listed here.
 */
type PageInputs = {
    [TID in InputID]?: OnboardingForm[TID] extends string ? TextInputRule : InputRule;
};

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
    submit?: () => Promise<RequestOutcome>;

    /** The status key of the request of `submit`, so the page can show its pending state and its error */
    requestKey?: RequestKey;
};

type FormPageConfig = PageBase & {
    kind: 'form';
    title: string;
    description?: string;
    inputs: PageInputs;

    /** The fields of the page from `form/fields`, and anything shown between them */
    content: ReactNode;

    /** Defaults to "Next", or to "Confirm" in edit mode */
    submitLabel?: string;
    enabledWhenOffline?: boolean;
};

/** A yes or no question saved to one boolean input */
type QuestionPageConfig = PageBase & {
    kind: 'question';
    fieldID: BooleanInputID;
    title: string;
    description: string;
    defaultValue: boolean;
};

type ConfirmationRow = {
    id: string;
    label: string;
    value: string;

    /** The page that edits the value. A row without it cannot be opened. */
    editPageID?: PageID;
};

type ConfirmationPageConfig = PageBase & {
    kind: 'confirmation';
    title: string;
    rows: ConfirmationRow[];
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

    /** The request that runs after the last page of the step */
    submit?: () => Promise<RequestOutcome>;

    /** The status key of the request of `submit`, so the page can show its pending state and its error */
    requestKey?: RequestKey;
};

type FlowPlan = {
    steps: StepConfig[];
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
    FieldValidator,
    FlowPlan,
    FormPageConfig,
    InputRule,
    ListPageConfig,
    ListRow,
    PageConfig,
    PageID,
    PageInputs,
    PageTransition,
    PlanContext,
    QuestionPageConfig,
    StepConfig,
    StepID,
    TextInputRule,
};
