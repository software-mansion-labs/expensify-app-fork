/**
 * Renders one generic page of a plan by its kind. Custom pages belong to the flow, so the flow screen renders them
 * itself. Each page is keyed by its ID, so moving to another page starts it with fresh local state.
 */
import useLocalize from '@hooks/useLocalize';

import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {OnboardingFormID} from '@pages/SimplifiedBankOnboarding/contract/formID';
import type {CustomPageConfig, PageConfig, PageID, StepConfig} from '@pages/SimplifiedBankOnboarding/core/plan/types';

import React from 'react';

import ConfirmationPage from './ConfirmationPage';
import FormPage from './FormPage';
import getConfirmationRows from './getConfirmationRows';
import ListPage from './ListPage';
import QuestionPage from './QuestionPage';

type PageRendererProps = {
    /** The form that the form pages render */
    formID: OnboardingFormID;

    /** The step of the page, whose form pages a confirmation page sums up */
    step: StepConfig;
    page: Exclude<PageConfig, CustomPageConfig>;

    /** The answers of the flow, which the fields and the confirmation rows show */
    answers: OnboardingDraft;
    isEditing: boolean;

    /** The submit of the page sends no request */
    canSubmitOffline: boolean;

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
};

function PageRenderer({formID, step, page, answers, isEditing, canSubmitOffline, isLoading, errorText, onSubmit, onEdit, onRowPress}: PageRendererProps) {
    const {translate} = useLocalize();

    switch (page.kind) {
        case 'form':
            return (
                <FormPage
                    key={page.id}
                    formID={formID}
                    page={page}
                    answers={answers}
                    isEditing={isEditing}
                    canSubmitOffline={canSubmitOffline}
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
                    rows={getConfirmationRows(step, page.id, answers, translate)}
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
        default:
            return null;
    }
}

export default PageRenderer;
