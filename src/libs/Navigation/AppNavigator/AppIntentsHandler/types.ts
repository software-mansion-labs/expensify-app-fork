/** Names of the invocations dispatched by the Swift App Intents in Mobile-Expensify/iOS/Expensify/AppIntents */
const APP_INTENT_NAMES = {
    SCAN_RECEIPT: 'scanReceipt',
    LOG_EXPENSE: 'logExpense',
    SHOW_EXPENSES: 'showExpenses',
    EDIT_EXPENSES: 'editExpenses',
    START_TRIP: 'startTrip',
    STOP_TRIP: 'stopTrip',
} as const;

/** Entity catalogs the Swift App Intents read without waiting for JavaScript */
const APP_INTENT_ENTITY_KINDS = {
    EXPENSE: 'expense',
    EXPENSE_CATEGORY: 'expenseCategory',
    EXPENSE_TAG: 'expenseTag',
    TODO_SUMMARY: 'todoSummary',
} as const;

/** Expenses of one workspace that get the same category and tag, because category and tag names are per workspace */
type ExpensesEditGroup = {
    /** Workspace the expenses belong to */
    policyID: string;

    /** Expenses to change */
    transactionIDs: string[];

    /** New category, as it is named in the workspace */
    category?: string;

    /** New first-level tag, as it is named in the workspace */
    tag?: string;
};

/** A change Siri asked for on several expenses at once */
type ExpensesEdit = {
    /** ID of the invocation that asked for the change, so two changes in a row are applied separately */
    invocationID: string;

    /** The expenses to change, grouped by workspace */
    groups: ExpensesEditGroup[];

    /** New description for every expense */
    description?: string;

    /** Search query that lists the changed expenses, opened once the change is applied */
    query?: string;
};

export {APP_INTENT_NAMES, APP_INTENT_ENTITY_KINDS};
export type {ExpensesEdit, ExpensesEditGroup};
