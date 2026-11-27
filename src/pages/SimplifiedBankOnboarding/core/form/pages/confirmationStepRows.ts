/**
 * The rows of a confirmation page and of a list page in the shape that the shared confirmation step renders, so both
 * kinds of page share one component. Each row is already wired to what a press on it opens.
 */
import type {SummaryGroupRow} from '@components/SubStepForms/ConfirmationStep';

import type {ConfirmationRow, ListPageConfig} from '@pages/SimplifiedBankOnboarding/core/plan/types';

/** An answer under its label. A press opens the page that edits it. */
function getConfirmationStepRows(rows: ConfirmationRow[], onEdit: (pageID: string) => void): SummaryGroupRow[] {
    return rows.map((row) => ({
        id: row.id,
        description: row.label,
        title: row.value,
        shouldShowRightIcon: true,
        onPress: () => onEdit(row.editPageID),
    }));
}

/**
 * The heading of the list and one row per entry. A press opens the entry. An entry that cannot be opened, such as the
 * current user in the owner list, is a plain row without a chevron.
 */
function getListStepRows(page: ListPageConfig, onRowPress: (rowID: string) => void): SummaryGroupRow[] {
    if (page.rows.length === 0) {
        return [];
    }
    const headingRows: SummaryGroupRow[] = page.rowsTitle ? [{kind: 'label', id: `${page.id}-heading`, title: page.rowsTitle}] : [];

    const entryRows = page.rows.map((row): SummaryGroupRow => {
        const description = row.description ?? '';
        if (row.isReadOnly) {
            return {id: row.id, title: row.title, description, shouldShowRightIcon: false, interactive: false, onPress: () => {}};
        }
        return {kind: 'avatar', id: row.id, title: row.title, description, onPress: () => onRowPress(row.id)};
    });
    return [...headingRows, ...entryRows];
}

export {getConfirmationStepRows, getListStepRows};
