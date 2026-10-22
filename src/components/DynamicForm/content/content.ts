import type {DynamicFormValues, ParsedContent, ParsedContentItem} from '@components/DynamicForm/types';
import isShown, {getShownFields} from '@components/DynamicForm/utils/isShown';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {DynamicFormContentItem, DynamicFormField, DynamicFormHeading} from '@src/types/onyx';

import {fieldDefinition, getContentItemCondition, isField, parseContentItem} from './definitions';
import {toFormErrors} from './getFieldErrors';

/** The content as this App version can draw it. Parse it once where the schema comes in, so everything after reads items it can trust. */
function parseContent(items: DynamicFormContentItem[]): ParsedContent {
    const parsedItems = items.flatMap((item) => parseContentItem(item) ?? []);
    return {items: parsedItems, fields: parsedItems.filter(isField)};
}

/** Fields that are already parsed, such as a list's entry fields, as content */
function getFieldsContent(fields: DynamicFormField[]): ParsedContent {
    return {items: fields, fields};
}

/** The fields the user sees right now, which are also the only ones validated and submitted. `allFields` is the whole form when `content` is one page of it, since a controlling field can sit on another page. */
function getVisibleFields(content: ParsedContent, values: DynamicFormValues, allFields?: DynamicFormField[]): DynamicFormField[] {
    return getShownFields(content.fields, values, allFields ?? content.fields);
}

/**
 * The headings and fields the user sees right now. A heading with no visible field before the next shown heading is left out, so a hidden or unknown field never leaves an orphan title.
 * `allFields` is the whole form when `content` is one page of it, since a controlling field can sit on another page.
 */
function getVisibleContent(content: ParsedContent, values: DynamicFormValues, allFields?: DynamicFormField[]): ParsedContentItem[] {
    const controllers = allFields ?? content.fields;
    const visibleContent: ParsedContentItem[] = [];
    let pendingHeading: DynamicFormHeading | undefined;
    for (const item of content.items) {
        if (!isShown(getContentItemCondition(item), values, controllers)) {
            continue;
        }
        if (!isField(item)) {
            pendingHeading = item;
            continue;
        }
        if (pendingHeading) {
            visibleContent.push(pendingHeading);
            pendingHeading = undefined;
        }
        visibleContent.push(item);
    }
    return visibleContent;
}

/** The page's only question, if it has one. Fields it reveals, such as an "Other" description, do not count, so the layout stays put when they appear. */
function getLoneField(visibleFields: DynamicFormField[]): DynamicFormField | undefined {
    const visibleKeys = new Set(visibleFields.map((field) => field.key));
    const questions = visibleFields.filter((field) => !field.showWhen || !visibleKeys.has(field.showWhen.key));
    return questions.length === 1 ? questions.at(0) : undefined;
}

/** Errors for the fields the user can see, keyed by draft key, in the shape FormProvider's `validate` returns */
function getContentErrors(content: ParsedContent, values: DynamicFormValues, translate: LocalizedTranslate, allFields?: DynamicFormField[]): Record<string, string> {
    return toFormErrors(getVisibleFields(content, values, allFields).flatMap((field) => fieldDefinition.getErrors(field, values, translate)));
}

/** The answers to the fields the user can see, so answers left on fields hidden later are not submitted */
function getContentAnswers(content: ParsedContent, values: DynamicFormValues, allFields?: DynamicFormField[]): DynamicFormValues {
    return Object.fromEntries(getVisibleFields(content, values, allFields).flatMap((field) => Object.entries(fieldDefinition.getAnswers(field, values))));
}

/** Draft keys of the content's answers that are kept in memory only */
function getContentSensitiveKeys(content: ParsedContent): string[] {
    return content.fields.flatMap((field) => fieldDefinition.getSensitiveKeys(field));
}

export {getContentAnswers, getContentErrors, getContentSensitiveKeys, getFieldsContent, getLoneField, getVisibleContent, getVisibleFields, parseContent};
