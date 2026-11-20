/**
 * The shape of a flow: a plan of steps, each step a list of pages, each form page a list of fields. The builders in
 * `formConfig/` produce it from the answers, the controller walks it and `form/` renders one page of it. Labels are
 * already translated, so the renderer needs no knowledge of the flow.
 */
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {RequestName} from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import type {RequestOutcome} from '@pages/SimplifiedBankOnboarding/requests/types';
import type {InputID, OnboardingDraft, OnboardingForm} from '@pages/SimplifiedBankOnboarding/types/form';

import type CONST from '@src/CONST';
import type {FileObject} from '@src/types/utils/Attachment';

import type {ValueOf} from 'type-fest';

/** The inputs whose value has the given type, so a field can only point at an input that holds its kind of value */
type InputIDWithValue<TValue> = {[TID in InputID]: OnboardingForm[TID] extends TValue ? TID : never}[InputID];

type TextInputID = InputIDWithValue<string>;
type BooleanInputID = InputIDWithValue<boolean>;
type FileInputID = InputIDWithValue<FileObject[]>;

/** The URL `page` value of a step */
type StepID = string;

/** The URL `subPage` value of a page */
type PageID = string;

/**
 * Returns the translated error of a value, or undefined when the value is valid. The other values of the form are there
 * for the rules that compare two inputs, such as two emails that must differ.
 */
type FieldValidator = (value: string, values: OnboardingDraft) => string | undefined;

type RequiredFieldProps = {
    isRequired?: boolean;

    /** The error of an empty required field. The generic "field required" error is shown without it. */
    requiredErrorText?: string;
};

type TextFieldConfig = RequiredFieldProps & {
    type: 'text';
    id: TextInputID;
    label: string;
    defaultValue: string;
    validate?: FieldValidator;

    /** The server accepted the value and no longer takes a new one */
    isLocked?: boolean;
    inputMode?: ValueOf<typeof CONST.INPUT_MODE>;
    maxLength?: number;
    placeholder?: string;
    hint?: string;
};

type DateFieldConfig = RequiredFieldProps & {
    type: 'date';
    id: TextInputID;
    label: string;
    defaultValue: string;

    /** The date must give an age between the payment minimum and the maximum of CONST.DATE_BIRTH */
    isDateOfBirth?: boolean;
};

type PicklistOption = {
    value: string;
    label: string;
};

type PicklistFieldConfig = RequiredFieldProps & {
    type: 'picklist';
    id: TextInputID;
    label: string;
    defaultValue: string;
    options: PicklistOption[];
    isLocked?: boolean;

    /** The title of the list that opens from the row. Defaults to the label. */
    modalTitle?: string;

    /** The label of the search input of that list. Defaults to the label. */
    searchTitle?: string;
};

type CheckboxFieldConfig = RequiredFieldProps & {
    type: 'checkbox';
    id: BooleanInputID;
    label: string;
    defaultValue: boolean;
};

type FileFieldConfig = RequiredFieldProps & {
    type: 'file';
    id: FileInputID;
    label: string;
    defaultValue: FileObject[];

    /** The text under the file button, such as what the document must show */
    description?: string;
    acceptedFileTypes: Array<ValueOf<typeof CONST.API_ATTACHMENT_VALIDATIONS.ALLOWED_RECEIPT_EXTENSIONS>>;
    fileLimit: number;

    /** In bytes */
    maxFileSize?: number;
};

/** A value the user sees on the page but does not type, such as data that the server already holds */
type ReadOnlyFieldConfig = {
    type: 'readOnly';

    /** The React key of the row. It is not an input. */
    id: string;
    label: string;
    value: string;
};

type InputFieldConfig = TextFieldConfig | DateFieldConfig | PicklistFieldConfig | CheckboxFieldConfig | FileFieldConfig;

type FieldConfig = InputFieldConfig | ReadOnlyFieldConfig;

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

    /** The name of the request of `submit`, so the page can show its pending state and its error */
    requestName?: RequestName;
};

type FormPageConfig = PageBase & {
    kind: 'form';
    title: string;
    description?: string;
    fields: FieldConfig[];

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

    /** The name of the request of `submit`, so the page can show its pending state and its error */
    requestName?: RequestName;
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
    BooleanInputID,
    CheckboxFieldConfig,
    ConfirmationPageConfig,
    ConfirmationRow,
    CustomPageConfig,
    CustomStepName,
    DateFieldConfig,
    FieldConfig,
    FieldValidator,
    FileFieldConfig,
    FileInputID,
    FlowPlan,
    FormPageConfig,
    InputFieldConfig,
    ListPageConfig,
    ListRow,
    PageConfig,
    PageID,
    PageTransition,
    PicklistFieldConfig,
    PicklistOption,
    PlanContext,
    QuestionPageConfig,
    ReadOnlyFieldConfig,
    StepConfig,
    StepID,
    TextFieldConfig,
    TextInputID,
};
