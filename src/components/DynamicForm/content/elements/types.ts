import type {DynamicFormError, DynamicFormValues} from '@components/DynamicForm/types';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';
import type {SummaryGroupRow} from '@components/SubStepForms/ConfirmationStep';

import type {DynamicFormCondition, DynamicFormElement, DynamicFormInputElement, DynamicFormSchemaElement} from '@src/types/onyx';

type DynamicFormElementType = DynamicFormElement['elementType'];

type InputElementType = DynamicFormInputElement['elementType'];

/** Element types that hold no answer, such as a heading or a banner */
type StaticElementType = Exclude<DynamicFormElementType, InputElementType>;

/** The element of one type. An intersection rather than Extract, so an element's `elementType` indexes a definition map for a generic type. */
type ElementOfType<TType extends DynamicFormElementType> = DynamicFormElement & {elementType: TType};

/** What every element type tells the content about its elements */
type ElementDefinition<TType extends DynamicFormElementType> = {
    /** The element as this App version can draw it, or undefined when the schema sent it malformed. The schema is checked here only, so everything after parsing can trust the element. */
    parse: (element: DynamicFormSchemaElement) => ElementOfType<TType> | undefined;

    /** The condition that shows the element. Wise shows or hides fields only by sending new requirements, so its elements have none. */
    getCondition: (element: ElementOfType<TType>) => DynamicFormCondition | undefined;
};

/** An element type that holds no answer */
type StaticElementDefinition<TType extends StaticElementType> = ElementDefinition<TType> & {
    /** The element titles the inputs after it, so it is left out when no visible input follows it before the next such element */
    introducesInputs: boolean;
};

/** What the confirmation page does when the user taps an answer */
type ConfirmationRowHandlers = {
    /** Opens the page the answer is on */
    onEdit: () => void;

    /** Opens the editor of a list entry */
    onEditListItem: (listKey: string, itemID: string) => void;
};

/** The wording a page's lone question gives the page when the page has no title of its own */
type InputHeadline = {
    /** The question the input asks, which names its section on the confirmation page */
    question: string | undefined;

    /** The input's label, the headline when there is no question */
    label: string;
};

/** An element type that holds an answer, and how that answer is checked, submitted and summarized */
type InputElementDefinition<TType extends InputElementType> = ElementDefinition<TType> & {
    /** Errors of the input's answers the user can see, in the order FormProvider shows them */
    getErrors: (input: ElementOfType<TType>, values: DynamicFormValues, translate: LocalizedTranslate) => DynamicFormError[];

    /** The answers the input submits, keyed by draft key */
    getAnswers: (input: ElementOfType<TType>, values: DynamicFormValues) => DynamicFormValues;

    /** Draft keys of the answers kept in memory only, never in the draft */
    getSensitiveKeys: (input: ElementOfType<TType>) => string[];

    /** The rows of the input on the confirmation page */
    getConfirmationRows: (input: ElementOfType<TType>, values: DynamicFormValues, translate: LocalizedTranslate, handlers: ConfirmationRowHandlers) => SummaryGroupRow[];

    /** The input needs a page of its own when the App groups a flat list of elements into pages */
    needsOwnPage: (input: ElementOfType<TType>) => boolean;

    /** The wording the input gives a page it is the lone question of, or undefined when it leaves the page untitled */
    getHeadline: (input: ElementOfType<TType>, translate: LocalizedTranslate) => InputHeadline | undefined;
};

export type {
    ConfirmationRowHandlers,
    DynamicFormElementType,
    ElementDefinition,
    ElementOfType,
    InputElementDefinition,
    InputElementType,
    InputHeadline,
    StaticElementDefinition,
    StaticElementType,
};
