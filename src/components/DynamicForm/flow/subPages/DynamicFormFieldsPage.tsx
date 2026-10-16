import {getContentErrors, getContentFields} from '@components/DynamicForm/content/content';
import DynamicFormContent from '@components/DynamicForm/content/DynamicFormContent';
import {getPageTitle} from '@components/DynamicForm/flow/pages';
import type {DynamicFormFlowPage, DynamicFormSubPageProps} from '@components/DynamicForm/flow/types';
import {getLocalizedText, toDynamicFormValues} from '@components/DynamicForm/shared';
import type {DynamicFormValues} from '@components/DynamicForm/types';
import FormProvider from '@components/Form/FormProvider';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';

import React from 'react';

import DynamicFormPageHeader from './DynamicFormPageHeader';

/** A sensitive list lives in memory, which the editor page and a removal update, so the form's own copy of it may be stale */
function getMemoryListAnswers(page: DynamicFormFlowPage, values: DynamicFormValues): DynamicFormValues {
    const memoryLists = getContentFields(page.content).filter((field) => field.type === 'list' && !!field.sensitive);
    return Object.fromEntries(memoryLists.map((field) => [field.key, values[field.key]]));
}

/** One page of a dynamic form flow: its title and description, its fields and a Next button */
function DynamicFormFieldsPage({
    currentPageName,
    isEditing,
    isLastPage,
    onNext,
    formID,
    pages,
    values,
    currency,
    maxFileSize,
    onRefreshRequirements,
    onPageSubmit,
    onOpenListItemEditor,
    onListItemsChange,
}: DynamicFormSubPageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const page = pages.find((candidate) => candidate.key === currentPageName);
    if (!page) {
        return null;
    }
    const memoryListAnswers = getMemoryListAnswers(page, values);
    const withInputValues = (inputValues: unknown): DynamicFormValues => ({...values, ...toDynamicFormValues(inputValues), ...memoryListAnswers});
    const hasOwnTitle = !!getLocalizedText(translate, page.titleKey, page.title);

    return (
        <FormProvider
            formID={formID}
            submitButtonText={translate(isEditing || isLastPage ? 'common.confirm' : 'common.next')}
            validate={(inputValues) => getContentErrors(page.content, withInputValues(inputValues), translate)}
            onSubmit={(inputValues) => {
                const pageValues = toDynamicFormValues(inputValues);
                onPageSubmit(page, pageValues);
                onNext(pageValues);
            }}
            style={[styles.mh5, styles.flexGrow1]}
            submitButtonStyles={styles.mb0}
            keyboardSubmitBehavior={CONST.KEYBOARD_SUBMIT_BEHAVIOR.SUBMIT_ONLY}
            // An offline request is saved to disk, so the last page submits only online, as the confirmation page does
            enabledWhenOffline={!isLastPage}
        >
            {({inputValues}) => {
                const currentValues = withInputValues(inputValues);
                return (
                    <>
                        <DynamicFormPageHeader
                            title={getPageTitle(page, currentValues, translate)}
                            description={getLocalizedText(translate, page.descriptionKey, page.description)}
                        />
                        <DynamicFormContent
                            content={page.content}
                            isLoneFieldInHeadline={!hasOwnTitle}
                            values={currentValues}
                            currency={currency}
                            maxFileSize={maxFileSize}
                            onRefreshRequirements={onRefreshRequirements}
                            onOpenListItemEditor={onOpenListItemEditor}
                            onListItemsChange={onListItemsChange}
                        />
                    </>
                );
            }}
        </FormProvider>
    );
}

export default DynamicFormFieldsPage;
