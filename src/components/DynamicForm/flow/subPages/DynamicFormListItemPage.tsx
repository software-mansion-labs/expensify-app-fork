import ActivityIndicator from '@components/ActivityIndicator';
import DynamicFormContent from '@components/DynamicForm/content/DynamicFormContent';
import {
    findListField,
    getListItems,
    getListItemSensitiveAnswers,
    summarizeListItem,
    getListItemAddTitle,
    getListItemFallbackTitle,
} from '@components/DynamicForm/content/elements/ExpensifyInput/list';
import toContentElements from '@components/DynamicForm/content/elements/ExpensifyInput/toContentElements';
import {getItemFieldErrors} from '@components/DynamicForm/content/elements/ExpensifyInput/validation';
import {parseListItemPageName} from '@components/DynamicForm/flow/listItemEditor';
import type {DynamicFormSubPageProps} from '@components/DynamicForm/flow/types';
import {toDynamicFormValues} from '@components/DynamicForm/shared';
import type {DynamicFormValues} from '@components/DynamicForm/types';
import FormProvider from '@components/Form/FormProvider';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import {clearListItemEdit, startListItemEdit} from '@userActions/DynamicForm';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {DynamicFormListItem} from '@src/types/onyx';

import React, {useEffect, useState} from 'react';
import {View} from 'react-native';

import DynamicFormPageHeader from './DynamicFormPageHeader';

/**
 * The editor form is shared by every entry, so it is filled with this entry's answers before its inputs mount, and emptied once the editor closes.
 * The entries of a sensitive list are never drafted, so its editor starts empty and its inputs take the entry's answers from memory.
 * Returns whether this page's answers are in.
 */
function useListItemEditorDraft(pageName: string | undefined, item: DynamicFormListItem | undefined, isSensitiveList: boolean): boolean {
    const [filledPageName, setFilledPageName] = useState<string>();

    useEffect(() => {
        let isCancelled = false;
        startListItemEdit(isSensitiveList ? {} : (item ?? {})).then(() => {
            if (isCancelled) {
                return;
            }
            setFilledPageName(pageName);
        });
        return () => {
            isCancelled = true;
        };
    }, [pageName, item, isSensitiveList]);

    useEffect(() => clearListItemEdit, []);

    return filledPageName === pageName;
}

/** The editor of one list entry, or of a new one: the entry's fields and a Save button */
function DynamicFormListItemPage({currentPageName, allFields, values, currency, maxFileSize, onRefreshRequirements, onListItemSave}: DynamicFormSubPageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const editorPage = parseListItemPageName(currentPageName);
    const listField = editorPage && findListField(allFields, editorPage.listKey);
    const item = listField && getListItems(values[listField.key]).find((candidate) => candidate.id === editorPage?.itemID);
    const isSensitiveList = !!listField?.sensitive;
    const isDraftFilled = useListItemEditorDraft(currentPageName, item, isSensitiveList);

    if (!listField) {
        return null;
    }
    // The flow's header stays above this page, so a spinner in the page is enough while the editor fills
    if (!isDraftFilled) {
        return (
            <View style={[styles.flex1, styles.fullScreenLoading]}>
                <ActivityIndicator size={CONST.ACTIVITY_INDICATOR_SIZE.LARGE} />
            </View>
        );
    }
    const sensitiveAnswers = item ? getListItemSensitiveAnswers(listField, item.id, values) : {};
    // Kept answers fill the inputs, so clearing one in the form clears it on save
    const keptAnswers = isSensitiveList ? {...item, ...sensitiveAnswers} : sensitiveAnswers;
    const withInputValues = (inputValues: unknown): DynamicFormValues => ({...keptAnswers, ...toDynamicFormValues(inputValues)});
    const title = item ? summarizeListItem(item, listField.itemFields, translate, getListItemFallbackTitle(listField, translate)).title : getListItemAddTitle(listField, translate);

    return (
        <FormProvider
            formID={ONYXKEYS.FORMS.DYNAMIC_FORM_LIST_ITEM_FORM}
            forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}
            submitButtonText={translate('common.save')}
            validate={(inputValues) => getItemFieldErrors(listField.itemFields, withInputValues(inputValues), translate)}
            onSubmit={(inputValues) => onListItemSave(listField.key, item?.id, withInputValues(inputValues))}
            style={[styles.mh5, styles.flexGrow1]}
            submitButtonStyles={styles.mb0}
            keyboardSubmitBehavior={CONST.KEYBOARD_SUBMIT_BEHAVIOR.SUBMIT_ONLY}
            enabledWhenOffline
        >
            {({inputValues}) => (
                <>
                    <DynamicFormPageHeader title={title} />
                    <DynamicFormContent
                        content={toContentElements(listField.itemFields)}
                        values={withInputValues(inputValues)}
                        isSensitive={isSensitiveList}
                        currency={currency}
                        maxFileSize={maxFileSize}
                        onRefreshRequirements={onRefreshRequirements}
                    />
                </>
            )}
        </FormProvider>
    );
}

export default DynamicFormListItemPage;
