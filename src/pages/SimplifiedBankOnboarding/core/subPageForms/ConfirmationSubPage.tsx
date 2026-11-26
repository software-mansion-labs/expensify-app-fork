/**
 * The block of a confirmation page: rows that open sub pages of the step in edit mode, and the button that saves the
 * draft update and sends the final request of the step. Edit mode of the pages before it returns here.
 */
import ConfirmationStep from '@components/SubStepForms/ConfirmationStep';

import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {PageID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import type {OnboardingRequest} from '@pages/SimplifiedBankOnboarding/core/requests/types';
import {usePageNavigation} from '@pages/SimplifiedBankOnboarding/core/step/pageNavigation';
import type {SubPageElementProps} from '@pages/SimplifiedBankOnboarding/core/step/readSubPages';

import React from 'react';

import useSubPageSubmit from './useSubPageSubmit';

type ConfirmationRow = {
    label: string;
    value: string;

    /** The page that the row opens in edit mode. A row without a page is read only. */
    page?: PageID;
};

type ConfirmationSubPageProps = SubPageElementProps & {
    title: string;
    rows: ConfirmationRow[];

    /** Sent by the confirm button. Without a request the button only moves on. */
    request?: OnboardingRequest;

    /**
     * Saved to the draft (and awaited) before the request is sent, or before moving on when there is none. The owner
     * confirmation uses it to put the owner buffer into the list.
     */
    getDraftUpdate?: () => OnboardingDraft;

    /** Extra content under the rows */
    children?: React.ReactNode;
};

function ConfirmationSubPage({title, rows, request, getDraftUpdate, children, next}: ConfirmationSubPageProps) {
    const {openPage} = usePageNavigation();
    const {submit, isPending, errorMessage} = useSubPageSubmit({request});

    const summaryItems = rows.map(({label, value, page}) => ({
        id: label,
        description: label,
        title: value,
        shouldShowRightIcon: !!page,
        interactive: !!page,
        onPress: () => {
            if (!page) {
                return;
            }
            openPage(page, {isEditing: true});
        },
    }));

    return (
        <ConfirmationStep
            onNext={() => submit(getDraftUpdate?.() ?? {}, next)}
            pageTitle={title}
            summaryItems={summaryItems}
            showOnfidoLinks={false}
            isLoading={isPending}
            error={errorMessage}
        >
            {children}
        </ConfirmationStep>
    );
}

export default ConfirmationSubPage;
export type {ConfirmationRow, ConfirmationSubPageProps};
