import type {DynamicFormFlowProps, DynamicFormInputOptions, DynamicFormListActions, DynamicFormValues} from '@components/DynamicForm/types';

import type {SubPageProps} from '@hooks/useSubPage/types';

import type {DynamicFormElement, DynamicFormField, DynamicFormPage} from '@src/types/onyx';

/** A page whose content is parsed once, so every part of the flow reads elements this App version can draw */
type DynamicFormFlowPage = Omit<DynamicFormPage, 'content'> & {
    content: DynamicFormElement[];
};

/** The form as every page of the flow reads it */
type DynamicFormFlowData = Pick<DynamicFormFlowProps, 'formID' | 'confirmationTitle' | 'isSubmitting' | 'submitError'> & {
    pages: DynamicFormFlowPage[];

    /** Every supported field of the form, which is where a `showWhen` finds its controller */
    allFields: DynamicFormField[];

    /** Draft answers merged with the sensitive answers kept in memory */
    values: DynamicFormValues;

    /** The last page submits the form, since no confirmation page follows */
    isLastPage: boolean;
};

/** What the pages of the flow hand back to it */
type DynamicFormFlowActions = Required<DynamicFormListActions> & {
    /** Saves the answers of a page the user leaves with Next */
    onPageSubmit: (page: DynamicFormFlowPage, pageValues: DynamicFormValues) => void;

    /** Saves a list entry from its editor page. Without `itemID` it adds a new entry. */
    onListItemSave: (listKey: string, itemID: string | undefined, answers: DynamicFormValues) => void;
};

/** Props of every page in the flow: useSubPage's routing props, the form's data, the screen's input options and the flow's actions */
type DynamicFormSubPageProps = SubPageProps & DynamicFormFlowData & DynamicFormInputOptions & DynamicFormFlowActions;

export type {DynamicFormFlowActions, DynamicFormFlowData, DynamicFormFlowPage, DynamicFormSubPageProps};
