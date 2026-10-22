/**
 * What each kind of content item means to the form. A heading and a field are told apart the way the schema tells them apart, by whether the item has a `type`.
 * The content code asks these definitions how to parse, show, check, submit and summarize an item, instead of looking at the item itself.
 */
import type {DynamicFormCondition, DynamicFormValues, ParsedContentItem} from '@components/DynamicForm/types';
import formatDynamicFieldValue from '@components/DynamicForm/utils/formatDynamicFieldValue';
import getAnswerKeys from '@components/DynamicForm/utils/getAnswerKeys';
import getLocalizedText, {getFieldLabel, getInputLabel} from '@components/DynamicForm/utils/getLocalizedText';
import isSensitiveField from '@components/DynamicForm/utils/isSensitiveField';
import {getShownFields} from '@components/DynamicForm/utils/isShown';
import {getListItems, getListItemSensitiveAnswers} from '@components/DynamicForm/utils/listItems';
import logSchemaProblem from '@components/DynamicForm/utils/logSchemaProblem';
import maskSensitiveValue, {getVisibleEnding} from '@components/DynamicForm/utils/maskSensitiveValue';
import summarizeListItem, {getListItemFallbackTitle} from '@components/DynamicForm/utils/summarizeListItem';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';
import type {SummaryGroupRow} from '@components/SubStepForms/ConfirmationStep';

import {getLetterAvatarURLForName} from '@libs/UserAvatarUtils';

import CONST from '@src/CONST';
import type {DynamicFormContentItem, DynamicFormField, DynamicFormFieldType, DynamicFormHeading, DynamicFormListField, DynamicFormSchemaField} from '@src/types/onyx';

import noop from 'lodash/noop';

import type {FieldError} from './getFieldErrors';

import {getFieldErrors} from './getFieldErrors';

/** What every kind of content item tells the content about its items */
type ContentItemDefinition<TSchemaItem, TItem extends ParsedContentItem> = {
    /** The item as this App version can draw it, or undefined when it cannot. The schema is checked here only, so everything after parsing can trust the item. */
    parse: (item: TSchemaItem) => TItem | undefined;

    /** The condition that shows the item */
    getCondition: (item: TItem) => DynamicFormCondition | undefined;
};

/** What the confirmation page does when the user taps an answer, and how the answer's section names it */
type ConfirmationRowOptions = {
    /** Opens the page the answer is on */
    onEditPage: () => void;

    /** Opens the editor of a list entry */
    onEditListItem: (listKey: string, itemID: string) => void;

    /** The section heading names the field, since it is the section's only answer */
    isNamedBySection: boolean;
};

/** The wording a page's lone question gives a page that has no title of its own */
type FieldHeadline = {
    /** The question the field asks, which also names its section on the confirmation page */
    question: string | undefined;

    /** The field's input label, the headline when there is no question */
    label: string;
};

/** A kind of item that holds an answer, and how that answer is checked, submitted and summarized */
type FieldDefinition = ContentItemDefinition<DynamicFormSchemaField, DynamicFormField> & {
    /** Errors of the field's answers, in the order FormProvider shows them */
    getErrors: (field: DynamicFormField, values: DynamicFormValues, translate: LocalizedTranslate) => FieldError[];

    /** The answers the field submits, keyed by draft key. List entries get their sensitive answers back from memory. */
    getAnswers: (field: DynamicFormField, values: DynamicFormValues) => DynamicFormValues;

    /** Draft keys of the answers kept in memory only, never in the draft */
    getSensitiveKeys: (field: DynamicFormField) => string[];

    /** The field's rows on the confirmation page */
    getConfirmationRows: (field: DynamicFormField, values: DynamicFormValues, translate: LocalizedTranslate, options: ConfirmationRowOptions) => SummaryGroupRow[];

    /** The wording the field gives a page it is the lone question of */
    getHeadline: (field: DynamicFormField, translate: LocalizedTranslate) => FieldHeadline;

    /** The field needs a page of its own when the App groups a flat list of fields into pages */
    needsOwnPage: (field: DynamicFormField) => boolean;
};

const SUPPORTED_FIELD_TYPES: Record<DynamicFormFieldType, true> = {
    text: true,
    number: true,
    select: true,
    radio: true,
    date: true,
    boolean: true,
    country: true,
    currency: true,
    address: true,
    multiselect: true,
    countryMultiselect: true,
    file: true,
    amount: true,
    percent: true,
    list: true,
};

const OWN_PAGE_TYPES = new Set<DynamicFormFieldType>(['address', 'file', 'multiselect', 'countryMultiselect', 'list']);

/** Every field is structurally a heading too, so a field is told apart by its `type` */
function isField<TItem extends DynamicFormContentItem>(item: TItem): item is Extract<TItem, {type: string}> {
    return 'type' in item;
}

function isSupportedField(field: DynamicFormSchemaField): field is DynamicFormField {
    return Object.hasOwn(SUPPORTED_FIELD_TYPES, field.type);
}

function parseField(field: DynamicFormSchemaField): DynamicFormField | undefined {
    if (!field.key) {
        logSchemaProblem('Field without a key', {type: field.type});
        return undefined;
    }
    if (!isSupportedField(field)) {
        logSchemaProblem('Unknown field type', {type: field.type, key: field.key});
        return undefined;
    }
    return field.type === 'list' ? {...field, itemFields: parseFields(field.itemFields)} : field;
}

/** The fields this App version can draw. A list's entry fields are parsed too, at any depth. */
function parseFields(fields: DynamicFormSchemaField[]): DynamicFormField[] {
    return fields.flatMap((field) => parseField(field) ?? []);
}

function getFieldAnswers(field: DynamicFormField, values: DynamicFormValues): DynamicFormValues {
    const answers: DynamicFormValues = {};
    for (const key of getAnswerKeys(field)) {
        if (values[key] !== undefined) {
            answers[key] = values[key];
        }
    }
    if (field.type === 'list' && values[field.key] !== undefined) {
        answers[field.key] = getListItems(values[field.key]).map((item) => ({
            id: item.id,
            ...getShownFieldsAnswers(field.itemFields, {...item, ...getListItemSensitiveAnswers(field, item.id, values)}),
        }));
    }
    return answers;
}

/** The answers to the fields the user can see, so answers left on fields hidden later are not submitted */
function getShownFieldsAnswers(fields: DynamicFormField[], values: DynamicFormValues): DynamicFormValues {
    return Object.fromEntries(getShownFields(fields, values).flatMap((field) => Object.entries(getFieldAnswers(field, values))));
}

/** One avatar row per list entry, which opens the entry. A readonly list gets plain rows that open nothing. */
function getListItemRows(field: DynamicFormListField, values: DynamicFormValues, translate: LocalizedTranslate, onEditListItem: ConfirmationRowOptions['onEditListItem']): SummaryGroupRow[] {
    return getListItems(values[field.key]).map((item, index): SummaryGroupRow => {
        const {title, description} = summarizeListItem(item, field.itemFields, translate, getListItemFallbackTitle(field, index, translate));
        if (field.readonly) {
            return {id: `${field.key}-${item.id}`, title, description, shouldShowRightIcon: false, onPress: noop, interactive: false};
        }
        return {
            kind: 'avatar',
            id: `${field.key}-${item.id}`,
            title,
            description,
            avatarSource: getLetterAvatarURLForName(title),
            onPress: () => onEditListItem(field.key, item.id),
        };
    });
}

/** A list with entries shows each entry as a row, and an empty list or any other field shows its answer. Readonly rows open nothing. */
function getConfirmationRows(
    field: DynamicFormField,
    values: DynamicFormValues,
    translate: LocalizedTranslate,
    {onEditPage, onEditListItem, isNamedBySection}: ConfirmationRowOptions,
): SummaryGroupRow[] {
    const listItemRows = field.type === 'list' ? getListItemRows(field, values, translate, onEditListItem) : [];
    if (listItemRows.length > 0) {
        return isNamedBySection ? listItemRows : [{kind: 'label', id: `${field.key}-label`, title: getFieldLabel(field, translate)}, ...listItemRows];
    }

    const answer = formatDynamicFieldValue(field, values, translate);
    const isEditable = !field.readonly;
    const fieldLabel = getFieldLabel(field, translate);
    const isMasked = isSensitiveField(field) && !!getVisibleEnding(answer);
    return [
        {
            id: field.key,
            description: fieldLabel,
            title: isSensitiveField(field) ? maskSensitiveValue(answer) : answer,
            // Screen readers would read out each bullet of the mask
            accessibilityLabel: isMasked ? translate('dynamicForm.maskedValueLabel', {label: fieldLabel, ending: getVisibleEnding(answer)}) : undefined,
            shouldShowRightIcon: isEditable,
            onPress: isEditable ? onEditPage : noop,
            interactive: isEditable,
        },
    ];
}

/** A title between fields. It has no answer, so it only needs text to draw and a condition. */
const headingDefinition: ContentItemDefinition<DynamicFormHeading, DynamicFormHeading> = {
    parse: (heading) => {
        if ([heading.title, heading.titleKey, heading.description, heading.descriptionKey].some((text) => !!text)) {
            return heading;
        }
        logSchemaProblem('Heading without text', {key: heading.key});
        return undefined;
    },
    getCondition: (heading) => heading.showWhen,
};

const fieldDefinition: FieldDefinition = {
    parse: parseField,
    getCondition: (field) => field.showWhen,
    getErrors: getFieldErrors,
    getAnswers: getFieldAnswers,
    getSensitiveKeys: (field) => (isSensitiveField(field) ? getAnswerKeys(field) : []),
    getConfirmationRows,
    getHeadline: (field, translate) => ({question: getLocalizedText(translate, field.questionKey, field.question), label: getInputLabel(field, translate)}),
    needsOwnPage: (field) => {
        if (OWN_PAGE_TYPES.has(field.type)) {
            return true;
        }
        if (field.type !== 'select') {
            return false;
        }
        return !!field.dependsOn || (field.values?.length ?? 0) > CONST.DYNAMIC_FORM.LARGE_SELECT_MIN_OPTIONS;
    },
};

/** The item as this App version can draw it. Unknown field types, fields without a key and headings without text are logged once and left out. */
function parseContentItem(item: DynamicFormContentItem): ParsedContentItem | undefined {
    return isField(item) ? fieldDefinition.parse(item) : headingDefinition.parse(item);
}

function getContentItemCondition(item: ParsedContentItem): DynamicFormCondition | undefined {
    return isField(item) ? fieldDefinition.getCondition(item) : headingDefinition.getCondition(item);
}

export {fieldDefinition, getContentItemCondition, headingDefinition, isField, parseContentItem, parseFields};
export type {ConfirmationRowOptions, FieldHeadline};
