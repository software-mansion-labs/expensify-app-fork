import DynamicFormElement from '@components/DynamicForm/elements/DynamicFormElement';
import type {DynamicFormValues} from '@components/DynamicForm/types';
import {toExpensifyInputElements} from '@components/DynamicForm/utils/elements';
import {getLoneField, getVisibleContent} from '@components/DynamicForm/utils/getVisibleFields';
import type {FormValue} from '@components/Form/types';

import CONST from '@src/CONST';
import type {DynamicFormField, DynamicFormListItem, DynamicFormSchemaElement} from '@src/types/onyx';

import React from 'react';

type DynamicFormFieldsProps = {
    /** Elements to render, in order. Elements of a type this App version does not know are left out. */
    content: DynamicFormSchemaElement[];

    /** Current answers, from FormProvider's render-prop `inputValues`, so showWhen and dependsOn follow the user's typing */
    values: DynamicFormValues;

    /** The whole form when `content` is one page of it, since a field's `showWhen` can name a controller on another page */
    allFields?: DynamicFormField[];

    /** The page's headline comes from its lone question, so that question's label is not drawn again above its input. False when the page has its own title, since the label then still says what the inputs are for. */
    isLoneFieldInHeadline?: boolean;

    /** Currency of amount fields that let the user pick none */
    currency?: string;

    /** Largest size of one file, in bytes, for file fields that set none. No limit when not set. */
    maxFileSize?: number;

    /** Called when the user changes a field marked `refreshOnChange`, with the draft key that changed, so the screen can fetch the schema again */
    onRefreshRequirements?: (inputID: string, value: FormValue) => void;

    /** Opens the editor page of a list entry, or of a new one without `itemID`. DynamicFormFlow passes it. Without it, list entries are edited in a modal. */
    onOpenListItemEditor?: (listKey: string, itemID?: string) => void;

    /** Called with a list's entries after the user removes one, so the flow can keep a sensitive list in memory up to date */
    onListItemsChange?: (listKey: string, items: DynamicFormListItem[]) => void;

    /** Every answer here is sensitive, as in the editor of an entry of a sensitive list: none is drafted, and each starts from the answer in `values` */
    isSensitive?: boolean;
};

/** The elements of a schema-driven form. Render it inside a FormProvider and validate the same content with getContentErrors. */
function DynamicFormFields({
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
}: DynamicFormFieldsProps) {
    const visibleContent = getVisibleContent(content, values, allFields);
    const loneField = getLoneField(visibleContent);
    const renderFields = (itemFields: DynamicFormField[], itemValues: DynamicFormValues, isItemSensitive: boolean) => (
        <DynamicFormFields
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

export default DynamicFormFields;
export type {DynamicFormFieldsProps};
