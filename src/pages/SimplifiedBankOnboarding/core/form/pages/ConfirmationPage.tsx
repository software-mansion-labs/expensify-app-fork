/**
 * The summary page that closes most steps. It renders the rows that the fields of the step gave with the shared
 * confirmation step, so a flow only names the page.
 */
import ConfirmationStep from '@components/SubStepForms/ConfirmationStep';

import type {ConfirmationPageConfig, ConfirmationRow, PageID} from '@pages/SimplifiedBankOnboarding/core/plan/types';

import React from 'react';

type ConfirmationPageProps = {
    page: ConfirmationPageConfig;
    rows: ConfirmationRow[];
    isLoading: boolean;

    /** The error of the request that the confirm started */
    errorText?: string;
    onSubmit: () => void;

    /** Opens the page that edits a row */
    onEdit: (pageID: PageID) => void;
};

/** A summary of the answers of a step. Each row opens the page that edits it, and Confirm submits the step. */
function ConfirmationPage({page, rows, isLoading, errorText, onSubmit, onEdit}: ConfirmationPageProps) {
    const summaryItems = rows.map((row) => ({
        id: row.id,
        description: row.label,
        title: row.value,
        shouldShowRightIcon: true,
        onPress: () => onEdit(row.editPageID),
    }));

    // The page moves through the controller, which knows the pages by ID, so the index based move of the step is not used
    return (
        <ConfirmationStep
            isEditing={false}
            onNext={() => onSubmit()}
            onMove={() => {}}
            pageTitle={page.title}
            summaryItems={summaryItems}
            showOnfidoLinks={false}
            isLoading={isLoading}
            error={errorText}
        />
    );
}

export default ConfirmationPage;
