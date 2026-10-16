import DynamicFormFields from '@components/DynamicForm/components/DynamicFormFields';
import DynamicFormPageHeader from '@components/DynamicForm/components/DynamicFormPageHeader';
import type {DynamicFormSubPageProps, DynamicFormValues} from '@components/DynamicForm/types';
import {getContentFields} from '@components/DynamicForm/utils/elements';
import getContentErrors from '@components/DynamicForm/utils/getContentErrors';
import getLocalizedText from '@components/DynamicForm/utils/getLocalizedText';
import getPageTitle from '@components/DynamicForm/utils/getPageTitle';
import isSensitiveField from '@components/DynamicForm/utils/isSensitiveField';
import toDynamicFormValues from '@components/DynamicForm/utils/toDynamicFormValues';
import FormProvider from '@components/Form/FormProvider';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import CONST from '@src/CONST';
import type {DynamicFormPage} from '@src/types/onyx';

import React from 'react';

/** A sensitive list lives in memory, which the editor page and a removal update, so the form's own copy of it may be stale */
function getMemoryListAnswers(page: DynamicFormPage, values: DynamicFormValues): DynamicFormValues {
    const memoryLists = getContentFields(page.content).filter((field) => field.type === 'list' && isSensitiveField(field));
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
    allFields,
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
            validate={(inputValues) => getContentErrors(page.content, withInputValues(inputValues), translate, allFields)}
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
                            title={getPageTitle(page, currentValues, translate, allFields)}
                            description={getLocalizedText(translate, page.descriptionKey, page.description)}
                        />
                        <DynamicFormFields
                            content={page.content}
                            allFields={allFields}
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
