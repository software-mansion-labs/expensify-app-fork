import FullscreenLoadingIndicator from '@components/FullscreenLoadingIndicator';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useSubPage from '@hooks/useSubPage';

import Navigation from '@libs/Navigation/Navigation';

import {clearSensitiveAnswers} from '@userActions/DynamicForm';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {DynamicFormPage} from '@src/types/onyx';
import isLoadingOnyxValue from '@src/types/utils/isLoadingOnyxValue';

import React from 'react';

import type {DynamicFormFlowProps, DynamicFormSubPageProps, DynamicFormValues} from './types';

import {parseListItemPageName} from './content/elements/ExpensifyInput/model/listItems';
import getContentAnswers from './content/getContentAnswers';
import DynamicFormShell from './flow/DynamicFormShell';
import getFirstIncompletePageIndex from './flow/getFirstIncompletePageIndex';
import getFlowPages from './flow/getFlowPages';
import getStartPageIndex from './flow/getStartPageIndex';
import getListItemEditor, {findListPage} from './flow/listItemEditor/getListItemEditor';
import isPageShown from './flow/pages/isPageShown';
import {getAllFields, getPages} from './flow/pages/paginate';
import {savePageAnswers} from './flow/saveAnswers';
import useSensitiveAnswersCleanup from './flow/useSensitiveAnswersCleanup';
import useStepIndicator from './flow/useStepIndicator';
import useUnavailablePageRedirect from './flow/useUnavailablePageRedirect';
import toDynamicFormValues from './shared/toDynamicFormValues';

/** A whole dynamic form: one page per schema page, skipping pages with nothing to ask, then a confirmation page */
function DynamicFormFlow({
    schema,
    formID,
    headerTitle,
    confirmationTitle,
    testID,
    buildRoute,
    shouldReplaceRoute,
    onSubmit,
    onPageSubmit,
    onBack,
    currency,
    maxFileSize,
    onRefreshRequirements,
    isSubmitting,
    submitError,
    layout = 'auto',
    hasConfirmation = true,
}: DynamicFormFlowProps) {
    const {translate} = useLocalize();
    const [draft, draftMetadata] = useOnyx(`${formID}Draft`);
    const [sensitiveAnswersByForm] = useOnyx(ONYXKEYS.RAM_ONLY_DYNAMIC_FORM_SENSITIVE_ANSWERS);
    const isDraftLoading = isLoadingOnyxValue(draftMetadata);
    const draftValues = toDynamicFormValues(draft);
    const values: DynamicFormValues = {...draftValues, ...sensitiveAnswersByForm?.[formID]};

    const pages = getPages(schema);
    const allFields = getAllFields(pages);
    const {subPages, skipPages, shownPages, hasConfirmationPage, firstShownPageIndex, lastShownPageIndex} = getFlowPages(pages, allFields, values, hasConfirmation);
    const startFrom = getStartPageIndex({pages, allFields, draftValues, isDraftLoading, firstShownPageIndex, lastShownPageIndex, translate});

    const {CurrentPage, isEditing, currentPageName, pageIndex, nextPage, prevPage, moveTo, resetToPage, isRedirecting} = useSubPage<DynamicFormSubPageProps>({
        pages: subPages,
        skipPages,
        startFrom,
        buildRoute,
        shouldReplaceRoute,
        onFinished: submitIfComplete,
    });

    /** Goes back to a page without stacking a second copy of it. Replaced routes leave nothing in the stack to go back to. */
    const returnTo = (pageName: string) => {
        if (shouldReplaceRoute) {
            resetToPage(pageName);
            return;
        }
        Navigation.goBack(buildRoute(pageName));
    };

    /** The confirmation page can be opened by URL before every page is answered, so an incomplete form goes back to its first gap instead. Without a confirmation page the last page's answers arrive here, before their draft is saved. */
    function submitIfComplete(lastPageValues?: unknown) {
        const answers = {...values, ...toDynamicFormValues(lastPageValues)};
        const firstIncompleteIndex = getFirstIncompletePageIndex(pages, allFields, answers, translate);
        const incompletePage = firstIncompleteIndex === -1 ? undefined : pages.at(firstIncompleteIndex);
        if (incompletePage) {
            returnTo(incompletePage.key);
            return;
        }
        // Inputs of a page the answers skip are not submitted
        const shownContent = pages.filter((page) => isPageShown(page, answers, allFields)).flatMap((page) => page.content);
        const submittedAnswers = getContentAnswers(shownContent, answers, allFields);
        if (isSubmitting === undefined) {
            clearSensitiveAnswers(formID);
        }
        onSubmit(submittedAnswers);
    }

    useSensitiveAnswersCleanup({formID, isRedirecting, isSubmitting, submitError});
    const isOnUnavailablePage = useUnavailablePageRedirect({subPages, skipPages, currentPageName, pageIndex, startFrom, buildRoute, isReady: !isDraftLoading && !isRedirecting});

    const listItemPage = parseListItemPageName(currentPageName);
    const {closeListItemEditor, onOpenListItemEditor, onListItemSave, onListItemsChange} = getListItemEditor({
        formID,
        pages,
        allFields,
        values,
        subPages,
        isEditing,
        currentPageName,
        moveTo,
        returnTo,
        onRefreshRequirements,
    });

    const handlePageSubmit = (page: DynamicFormPage, pageValues: DynamicFormValues) => {
        const screenAnswers = savePageAnswers(formID, page, {...values, ...pageValues}, allFields);
        onPageSubmit?.(page, screenAnswers);
    };

    const goBack = () => {
        if (listItemPage) {
            closeListItemEditor(listItemPage.listKey);
            return;
        }
        if (isEditing) {
            returnTo(CONST.DYNAMIC_FORM.CONFIRMATION_PAGE_KEY);
            return;
        }
        if (pageIndex <= firstShownPageIndex) {
            clearSensitiveAnswers(formID);
            onBack();
            return;
        }
        prevPage();
    };

    // An entry editor highlights its list's step, and the confirmation page the last one
    const stepPage = shownPages.find((page) => page.key === currentPageName) ?? (listItemPage && findListPage(pages, listItemPage.listKey));
    const {stepNames, stepIndex, shouldShowStepIndicator} = useStepIndicator({shownPages, hasConfirmationPage, layout, stepPage, isDraftLoading});
    const isWaitingForPage = isDraftLoading || isRedirecting || isOnUnavailablePage || (shownPages.length === 0 && pages.length > 0);

    return (
        <DynamicFormShell
            testID={testID}
            headerTitle={headerTitle}
            onBackButtonPress={goBack}
            stepNames={stepNames}
            stepIndex={stepIndex}
            shouldShowStepIndicator={shouldShowStepIndicator}
        >
            {isWaitingForPage ? (
                <FullscreenLoadingIndicator />
            ) : (
                <CurrentPage
                    isEditing={isEditing}
                    isLastPage={!hasConfirmationPage && pageIndex === lastShownPageIndex}
                    currentPageName={currentPageName}
                    onNext={nextPage}
                    onMove={moveTo}
                    prevPage={prevPage}
                    formID={formID}
                    pages={pages}
                    allFields={allFields}
                    values={values}
                    currency={currency}
                    maxFileSize={maxFileSize}
                    onRefreshRequirements={onRefreshRequirements}
                    onPageSubmit={handlePageSubmit}
                    onOpenListItemEditor={onOpenListItemEditor}
                    onListItemSave={onListItemSave}
                    onListItemsChange={onListItemsChange}
                    confirmationTitle={confirmationTitle}
                    isSubmitting={isSubmitting}
                    submitError={submitError}
                />
            )}
        </DynamicFormShell>
    );
}

export default DynamicFormFlow;
