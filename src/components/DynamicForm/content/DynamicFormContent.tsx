import type {DynamicFormInputOptions, DynamicFormListActions, DynamicFormRenderFields, DynamicFormValues} from '@components/DynamicForm/types';

import CONST from '@src/CONST';
import type {DynamicFormField, DynamicFormSchemaElement} from '@src/types/onyx';

import React from 'react';

import DynamicFormElement from './elements/DynamicFormElement';
import getLoneField from './getLoneField';
import getVisibleContent from './getVisibleContent';
import {toExpensifyInputElements} from './parseContent';

type DynamicFormContentProps = DynamicFormInputOptions &
    DynamicFormListActions & {
        /** Elements to render, in order. Elements of a type this App version does not know are left out. */
        content: DynamicFormSchemaElement[];

        /** Current answers, from FormProvider's render-prop `inputValues`, so showWhen and dependsOn follow the user's typing */
        values: DynamicFormValues;

        /** The whole form when `content` is one page of it, since a field's `showWhen` can name a controller on another page */
        allFields?: DynamicFormField[];

        /** The page's headline comes from its lone question, so that question's label is not drawn again above its input. False when the page has its own title, since the label then still says what the inputs are for. */
        isLoneFieldInHeadline?: boolean;

        /** Every answer here is sensitive, as in the editor of an entry of a sensitive list: none is drafted, and each starts from the answer in `values` */
        isSensitive?: boolean;
    };

/** The elements of a schema-driven form. Render it inside a FormProvider and validate the same content with getContentErrors. */
function DynamicFormContent({
    content,
    values,
    allFields,
    isLoneFieldInHeadline = false,
    currency = CONST.CURRENCY.USD,
    maxFileSize,
    onRefreshRequirements,
    onOpenListItemEditor,
    onListItemsChange,
    isSensitive = false,
}: DynamicFormContentProps) {
    const visibleContent = getVisibleContent(content, values, allFields);
    const loneField = getLoneField(visibleContent);
    const renderFields: DynamicFormRenderFields = (itemFields, itemValues, isItemSensitive) => (
        <DynamicFormContent
            content={toExpensifyInputElements(itemFields)}
            values={itemValues}
            isSensitive={isItemSensitive}
            currency={currency}
            maxFileSize={maxFileSize}
            onRefreshRequirements={onRefreshRequirements}
        />
    );

    return visibleContent.map((element, index) => (
        <DynamicFormElement
            key={`${element.elementType}-${element.key}`}
            element={element}
            isFirst={index === 0}
            values={values}
            currency={currency}
            maxFileSize={maxFileSize}
            isLoneField={element === loneField}
            shouldHideLabel={isLoneFieldInHeadline && element === loneField}
            onRefreshRequirements={onRefreshRequirements}
            onOpenListItemEditor={onOpenListItemEditor}
            onListItemsChange={onListItemsChange}
            isSensitive={isSensitive}
            renderFields={renderFields}
        />
    ));
}

export default DynamicFormContent;
export type {DynamicFormContentProps};
