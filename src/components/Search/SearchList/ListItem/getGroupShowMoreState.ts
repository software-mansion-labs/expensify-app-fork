type GroupShowMoreStateParams = {
    /** Expense report groups page through the rows they already hold, other groups ask their own search for more */
    isExpenseReportType: boolean;

    /** How many rows the group holds, pending deletes included */
    transactionsCount: number;

    /** How many rows an expense report group shows, ignored for other groups */
    transactionsVisibleLimit?: number;

    /** Whether the group's own search has rows it hasn't returned yet */
    hasMoreResults: boolean | undefined;

    /** Whether the group's own search is running */
    isLoading: boolean | undefined;

    /** Where the group's own search last started reading */
    offset: number | undefined;

    isOffline: boolean;
};

type GroupShowMoreState = {
    shouldShowMoreButton: boolean;
    shouldShowLoadingIndicator: boolean;
};

/**
 * Whether an open group shows its "Show more" link or its loading spinner. The link and the list's arrow-key focus
 * stops both read it from here, so a focus stop never points at a link that isn't on screen.
 */
function getGroupShowMoreState({
    isExpenseReportType,
    transactionsCount,
    transactionsVisibleLimit = 0,
    hasMoreResults,
    isLoading,
    offset = 0,
    isOffline,
}: GroupShowMoreStateParams): GroupShowMoreState {
    const hasMoreToShow = isExpenseReportType ? transactionsCount > transactionsVisibleLimit : !!hasMoreResults && !isOffline;

    // A group's first page shows the spinner only while it has no rows yet. Later pages always show it, below the rows already there.
    const isLoadingVisiblePage = (!transactionsCount && !!isLoading) || offset > 0;
    const shouldShowLoadingIndicator = !isExpenseReportType && !!isLoading && isLoadingVisiblePage;

    return {
        shouldShowMoreButton: hasMoreToShow && !shouldShowLoadingIndicator,
        shouldShowLoadingIndicator,
    };
}

export default getGroupShowMoreState;
export type {GroupShowMoreState};
