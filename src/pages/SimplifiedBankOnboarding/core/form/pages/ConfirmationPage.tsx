/**
 * The summary page that closes most steps, and the list of the entries of a repeated group, such as the owners. It
 * renders the rows it is given with the shared confirmation step, so a flow only names the page.
 */
import type {SummaryGroupRow} from '@components/SubStepForms/ConfirmationStep';
import ConfirmationStep from '@components/SubStepForms/ConfirmationStep';

import CONST from '@src/CONST';

import React from 'react';

type ConfirmationPageProps = {
    title: string;
    subtitle?: string;

    /** The answers of a step or the entries of a list. A row decides what a press on it opens. */
    rows: SummaryGroupRow[];
    isLoading: boolean;

    /** The error of the request that the confirm started */
    errorText?: string;
    onSubmit: () => void;
};

const ROWS_GROUP_ID = 'rows';

function ConfirmationPage({title, subtitle, rows, isLoading, errorText, onSubmit}: ConfirmationPageProps) {
    // The page moves through the controller, which knows the pages by ID, so the index based move of the step is not used.
    // The rows show what the user typed, such as an account number or the name of an owner, so session recordings hide them.
    return (
        <ConfirmationStep
            isEditing={false}
            onNext={onSubmit}
            onMove={() => {}}
            pageTitle={title}
            pageSubtitle={subtitle}
            groups={[{id: ROWS_GROUP_ID, name: '', rows}]}
            showOnfidoLinks={false}
            isLoading={isLoading}
            error={errorText}
            forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}
            shouldMarkTitleAsHeading
            shouldAnnounceSubmitState
        />
    );
}

export default ConfirmationPage;
