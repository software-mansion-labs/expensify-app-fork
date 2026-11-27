/**
 * Renders one generic page of a plan by its kind. Custom pages belong to the flow, so the flow screen renders them
 * itself. Each page is keyed by its ID, so moving to another page starts it with fresh local state.
 */
import useLocalize from '@hooks/useLocalize';

import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {OnboardingFormID} from '@pages/SimplifiedBankOnboarding/contract/formID';
import type {CustomPageConfig, PageConfig, StepConfig} from '@pages/SimplifiedBankOnboarding/core/plan/types';

import React from 'react';

import ConfirmationPage from './ConfirmationPage';
import {getConfirmationStepRows, getListStepRows} from './confirmationStepRows';
import FormPage from './FormPage';
import getConfirmationRows from './getConfirmationRows';

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
    onEdit: (pageID: string) => void;

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
        case 'confirmation':
            return (
                <ConfirmationPage
                    key={page.id}
                    title={page.title}
                    rows={getConfirmationStepRows(getConfirmationRows(step, page.id, answers, translate), onEdit)}
                    isLoading={isLoading}
                    errorText={errorText}
                    onSubmit={() => onSubmit({})}
                />
            );
        case 'list':
            return (
                <ConfirmationPage
                    key={page.id}
                    title={page.title}
                    subtitle={page.description}
                    rows={getListStepRows(page, onRowPress)}
                    isLoading={isLoading}
                    errorText={errorText}
                    onSubmit={() => onSubmit({})}
                />
            );
        default:
            return null;
    }
}

export default PageRenderer;
