import {getInputDefinition} from '@components/DynamicForm/content/elements/registry';
import {getVisibleInputs} from '@components/DynamicForm/content/getVisibleContent';
import {getPageSectionName, isPageShown} from '@components/DynamicForm/flow/pages';
import type {DynamicFormFlowPage, DynamicFormSubPageProps} from '@components/DynamicForm/flow/types';
import type {DynamicFormValues} from '@components/DynamicForm/types';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';
import ConfirmationStep from '@components/SubStepForms/ConfirmationStep';
import type {SummaryGroup} from '@components/SubStepForms/ConfirmationStep';

import useLocalize from '@hooks/useLocalize';

import CONST from '@src/CONST';
import type {DynamicFormField} from '@src/types/onyx';

import React from 'react';

/** One section per shown page holding its visible answers, each drawn by the rules of its element type. Tapping a row opens the page or entry to edit. Readonly rows open nothing. */
function getConfirmationItems(
    pages: DynamicFormFlowPage[],
    allFields: DynamicFormField[],
    values: DynamicFormValues,
    translate: LocalizedTranslate,
    onEditPage: (pageIndex: number) => void,
    onEditListItem: (listKey: string, itemID: string) => void,
): SummaryGroup[] {
    return pages.flatMap((page, pageIndex): SummaryGroup[] => {
        if (!isPageShown(page, values, allFields)) {
            return [];
        }
        const handlers = {onEdit: () => onEditPage(pageIndex), onEditListItem};
        return [
            {
                id: page.key,
                name: getPageSectionName(page, values, translate, allFields),
                rows: getVisibleInputs(page.content, values, allFields).flatMap((input) => getInputDefinition(input).getConfirmationRows(input, values, translate, handlers)),
            },
        ];
    });
}

/** The last page of a dynamic form flow: every answer as a row the user can tap to edit, and a Confirm button */
function DynamicFormConfirmationPage({isEditing, onNext, onMove, pages, allFields, values, confirmationTitle, isSubmitting, submitError, onOpenListItemEditor}: DynamicFormSubPageProps) {
    const {translate} = useLocalize();

    return (
        <ConfirmationStep
            isEditing={isEditing}
            // The flow submits whatever onNext carries, and the press event is not answers
            onNext={() => onNext()}
            onMove={onMove}
            pageTitle={confirmationTitle}
            groups={getConfirmationItems(pages, allFields, values, translate, onMove, onOpenListItemEditor)}
            showOnfidoLinks={false}
            isLoading={isSubmitting}
            error={submitError}
            forwardedFSClass={CONST.FULLSTORY.CLASS.MASK}
        />
    );
}

export default DynamicFormConfirmationPage;
export {getConfirmationItems};
