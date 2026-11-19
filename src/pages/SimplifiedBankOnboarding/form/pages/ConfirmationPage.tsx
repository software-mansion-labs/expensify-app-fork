import ConfirmationStep from '@components/SubStepForms/ConfirmationStep';

import type {ConfirmationPageConfig, ConfirmationRow, PageID} from '@pages/SimplifiedBankOnboarding/formConfig/types';

import React from 'react';

type ConfirmationPageProps = {
    page: ConfirmationPageConfig;
    isLoading: boolean;

    /** The error of the request that the confirm started */
    errorText?: string;
    onSubmit: () => void;

    /** Opens the page that edits a row */
    onEdit: (pageID: PageID) => void;
};

/** A summary of the answers of a step. Each row opens the page that edits it, and Confirm submits the step. */
function ConfirmationPage({page, isLoading, errorText, onSubmit, onEdit}: ConfirmationPageProps) {
    const getSummaryItem = (row: ConfirmationRow) => {
        const editPageID = row.editPageID;
        return {
            id: row.id,
            description: row.label,
            title: row.value,
            shouldShowRightIcon: !!editPageID,
            interactive: !!editPageID,
            onPress: () => {
                if (!editPageID) {
                    return;
                }
                onEdit(editPageID);
            },
        };
    };

    // The page moves through the controller, which knows the pages by ID, so the index based move of the step is not used
    return (
        <ConfirmationStep
            isEditing={false}
            onNext={() => onSubmit()}
            onMove={() => {}}
            pageTitle={page.title}
            summaryItems={page.rows.map(getSummaryItem)}
            showOnfidoLinks={false}
            isLoading={isLoading}
            error={errorText}
        />
    );
}

export default ConfirmationPage;
