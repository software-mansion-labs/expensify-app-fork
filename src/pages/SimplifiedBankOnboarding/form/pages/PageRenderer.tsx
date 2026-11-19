/**
 * Renders one page of a plan by its kind. The pages that are not forms belong to the flow, so the caller renders them
 * through `renderCustom`. Each page is keyed by its ID, so moving to another page starts it with fresh local state.
 */
import type {CustomPageConfig, PageConfig, PageID} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/types/form';

import type {ReactNode} from 'react';

import React from 'react';

import ConfirmationPage from './ConfirmationPage';
import FormPage from './FormPage';
import ListPage from './ListPage';
import QuestionPage from './QuestionPage';

type PageRendererProps = {
    page: PageConfig;
    isEditing: boolean;

    /** The request of the page is running */
    isLoading: boolean;

    /** The error of the request of the page */
    errorText?: string;

    /** The values of the page. Confirmation and list pages submit no values. */
    onSubmit: (values: OnboardingDraft) => void;

    /** A row of a confirmation page asks to edit its page */
    onEdit: (pageID: PageID) => void;

    /** A row of a list page was pressed */
    onRowPress: (rowID: string) => void;
    renderCustom: (page: CustomPageConfig) => ReactNode;
};

function PageRenderer({page, isEditing, isLoading, errorText, onSubmit, onEdit, onRowPress, renderCustom}: PageRendererProps) {
    switch (page.kind) {
        case 'form':
            return (
                <FormPage
                    key={page.id}
                    page={page}
                    isEditing={isEditing}
                    isLoading={isLoading}
                    errorText={errorText}
                    onSubmit={onSubmit}
                />
            );
        case 'question':
            return (
                <QuestionPage
                    key={page.id}
                    page={page}
                    isLoading={isLoading}
                    errorText={errorText}
                    onSubmit={onSubmit}
                />
            );
        case 'confirmation':
            return (
                <ConfirmationPage
                    key={page.id}
                    page={page}
                    isLoading={isLoading}
                    errorText={errorText}
                    onSubmit={() => onSubmit({})}
                    onEdit={onEdit}
                />
            );
        case 'list':
            return (
                <ListPage
                    key={page.id}
                    page={page}
                    isLoading={isLoading}
                    errorText={errorText}
                    onSubmit={() => onSubmit({})}
                    onRowPress={onRowPress}
                />
            );
        case 'custom':
            return renderCustom(page);
        default:
            return null;
    }
}

export default PageRenderer;
