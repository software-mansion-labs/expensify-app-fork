import {getFormatErrors} from '@components/DynamicForm/content/elements/inputBehavior';
import {isAnswered, toFormErrors} from '@components/DynamicForm/shared';
import type {DynamicFormError, DynamicFormValues} from '@components/DynamicForm/types';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import {
    getCountryZipRegexDetails,
    isValidDate,
    isValidLegalName,
    isValidPastDate,
    isValidPhoneInternational,
    isValidZipCodeForCountry,
    meetsMaximumAgeRequirement,
    meetsMinimumAgeRequirement,
} from '@libs/ValidationUtils';

import type {DynamicFormAddressField, DynamicFormChoiceField, DynamicFormField, DynamicFormFieldType, DynamicFormListField, DynamicFormSchemaField} from '@src/types/onyx';

import type {DynamicFormFieldOfType} from './types';

import {getAddressCountry, getAddressInputKeys, getFieldOptions, isStateAsked, isSupportedField} from './field';
import {getListItemFallbackTitle, getListItems, getListItemSensitiveAnswers, getVisibleFields, summarizeListItem} from './list';

/** An optional address the user has started filling in is checked like a required one, so it is never submitted in part */
function isAddressRequired(field: DynamicFormAddressField, values: DynamicFormValues): boolean {
    const {street, city, state, zipCode, country} = getAddressInputKeys(field.key);
    return field.required || [street, city, state, zipCode, country].some((partKey) => isAnswered(values[partKey]));
}

/** Each address part has its own input, so its errors go under its own draft key. The street is the field's own answer, which the required check covers. */
function getAddressPartErrors(field: DynamicFormAddressField, values: DynamicFormValues, translate: LocalizedTranslate): DynamicFormError[] {
    const addressKeys = getAddressInputKeys(field.key);
    const country = getAddressCountry(field.key, values);
    // A country whose zip format accepts an empty zip does not require one
    const isZipAsked = !country || !isValidZipCodeForCountry('', country);
    const errors: DynamicFormError[] = [];
    if (isAddressRequired(field, values)) {
        const requiredPartKeys = [addressKeys.city, addressKeys.country, ...(isZipAsked ? [addressKeys.zipCode] : []), ...(isStateAsked(country) ? [addressKeys.state] : [])];
        for (const partKey of requiredPartKeys) {
            if (!isAnswered(values[partKey])) {
                errors.push([partKey, translate('common.error.fieldRequired')]);
            }
        }
    }
    const zipCode = values[addressKeys.zipCode];
    if (field.rule !== 'zipCode' || typeof zipCode !== 'string' || zipCode.trim() === '') {
        return errors;
    }
    if (!isValidZipCodeForCountry(zipCode, country)) {
        errors.push([addressKeys.zipCode, translate('privatePersonalDetails.error.incorrectZipFormat', getCountryZipRegexDetails(country)?.samples)]);
    }
    return errors;
}

/** Checks a field the user has answered. Unanswered fields only get the required check. */
type FieldValidator<TType extends DynamicFormFieldType> = (field: DynamicFormFieldOfType<TType>, values: DynamicFormValues, translate: LocalizedTranslate) => string[];

const PERCENT_MIN = 1;
const PERCENT_MAX = 100;

function getStringAnswer(field: DynamicFormField, values: DynamicFormValues): string {
    const value = values[field.key];
    return typeof value === 'string' ? value : '';
}

function getChoiceErrors(field: DynamicFormChoiceField, values: DynamicFormValues, translate: LocalizedTranslate): string[] {
    const value = getStringAnswer(field, values);
    const isOffered = getFieldOptions(field, values).some((option) => option.key === value);
    return isOffered ? [] : [translate('dynamicForm.error.invalidOption')];
}

/** Options change with the answer they depend on, so a chosen key can stop being offered */
function getMultiChoiceErrors(field: DynamicFormFieldOfType<'multiselect' | 'countryMultiselect'>, values: DynamicFormValues, translate: LocalizedTranslate): string[] {
    const offeredKeys = new Set(getFieldOptions(field, values).map((option) => option.key));
    const answer = values[field.key];
    const chosenKeys: unknown[] = Array.isArray(answer) ? answer : [];
    return chosenKeys.every((key) => typeof key === 'string' && offeredKeys.has(key)) ? [] : [translate('dynamicForm.error.invalidOption')];
}

/** The list shows one error, so the first entry with a problem gives it, prefixed by the entry title so the user knows which one to open. The flow keeps sensitive answers in memory apart from their entry, so one lost with the memory is asked for again. */
function getListErrors(field: DynamicFormListField, values: DynamicFormValues, translate: LocalizedTranslate): string[] {
    const items = getListItems(values[field.key]);
    const messages: string[] = [];
    if (field.minItems !== undefined && items.length < field.minItems) {
        messages.push(translate('dynamicForm.error.tooFewItems', {min: field.minItems}));
    }
    if (field.maxItems !== undefined && items.length > field.maxItems) {
        messages.push(translate('dynamicForm.error.tooManyItems', {max: field.maxItems}));
    }
    const fallbackTitle = getListItemFallbackTitle(field, translate);
    for (const item of items) {
        const error = Object.values(getDynamicFieldErrors(field.itemFields, {...item, ...getListItemSensitiveAnswers(field, item.id, values)}, translate)).at(0);
        if (error) {
            messages.push(translate('dynamicForm.error.itemError', {item: summarizeListItem(item, field.itemFields, translate, fallbackTitle).title, error}));
            break;
        }
    }
    return messages;
}

/** For inputs that only accept valid answers: UploadFile checks type and count, AmountForm rejects invalid typing, and the street is checked by required alone */
const noChecks = () => [];

const VALIDATORS: {[TType in DynamicFormFieldType]: FieldValidator<TType>} = {
    text: (field, values, translate) => {
        const value = getStringAnswer(field, values);
        const messages = getFormatErrors(field, value, translate);
        if (field.rule === 'legalName' && !isValidLegalName(value)) {
            messages.push(translate('privatePersonalDetails.error.hasInvalidCharacter'));
        }
        if (field.rule === 'phone' && !isValidPhoneInternational(value)) {
            messages.push(translate('common.error.phoneNumber'));
        }
        return messages;
    },
    number: (field, values, translate) => {
        const value = getStringAnswer(field, values);
        if (!Number.isFinite(Number(value))) {
            return [translate('dynamicForm.error.invalidFormat', {example: field.example})];
        }
        return getFormatErrors(field, value, translate);
    },
    select: getChoiceErrors,
    radio: getChoiceErrors,
    date: (field, values, translate) => {
        const value = getStringAnswer(field, values);
        if (!isValidDate(value)) {
            return [translate('common.error.dateInvalid')];
        }
        if (field.rule !== 'dateOfBirth') {
            return [];
        }
        if (!isValidPastDate(value) || !meetsMaximumAgeRequirement(value)) {
            return [translate('bankAccount.error.dob')];
        }
        return meetsMinimumAgeRequirement(value) ? [] : [translate('bankAccount.error.age')];
    },
    address: noChecks,
    multiselect: getMultiChoiceErrors,
    countryMultiselect: getMultiChoiceErrors,
    boolean: noChecks,
    country: noChecks,
    currency: noChecks,
    file: noChecks,
    amount: noChecks,
    percent: (field, values, translate) => {
        const percent = Number(getStringAnswer(field, values));
        return Number.isFinite(percent) && percent >= PERCENT_MIN && percent <= PERCENT_MAX ? [] : [translate('dynamicForm.error.outOfRange', {min: PERCENT_MIN, max: PERCENT_MAX})];
    },
    list: getListErrors,
};

function validateAnswer<TType extends DynamicFormFieldType>(field: DynamicFormFieldOfType<TType>, values: DynamicFormValues, translate: LocalizedTranslate): string[] {
    const validate: FieldValidator<TType> = VALIDATORS[field.type];
    return validate(field, values, translate);
}

function isFieldRequired(field: DynamicFormField, values: DynamicFormValues): boolean {
    return field.type === 'address' ? isAddressRequired(field, values) : field.required;
}

/** The errors of one field the user can see. A readonly field is never checked, since the user cannot change it. */
function getFieldErrors(field: DynamicFormField, values: DynamicFormValues, translate: LocalizedTranslate): DynamicFormError[] {
    if (field.readonly) {
        return [];
    }
    const partErrors = field.type === 'address' ? getAddressPartErrors(field, values, translate) : [];
    if (!isAnswered(values[field.key], field.type === 'boolean' && field.presentation !== 'checkbox')) {
        return isFieldRequired(field, values) ? [...partErrors, [field.key, translate('common.error.fieldRequired')]] : partErrors;
    }
    return [...partErrors, ...validateAnswer(field, values, translate).map((message): DynamicFormError => [field.key, message])];
}

/**
 * Errors for the fields the user can see, keyed by draft key, in the shape FormProvider's `validate` returns.
 * Pass the whole form as `allFields` when a `showWhen` can name a field on another page.
 */
function getDynamicFieldErrors(fields: DynamicFormSchemaField[], values: DynamicFormValues, translate: LocalizedTranslate, allFields?: DynamicFormField[]): Record<string, string> {
    const visibleFields = getVisibleFields(fields.filter(isSupportedField), values, allFields);
    return toFormErrors(visibleFields.flatMap((field) => getFieldErrors(field, values, translate)));
}

export default getDynamicFieldErrors;
export {getFieldErrors};
