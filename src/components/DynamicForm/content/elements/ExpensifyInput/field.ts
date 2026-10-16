import {getLocalizedText, logSchemaProblem} from '@components/DynamicForm/shared';
import type {DynamicFormValues} from '@components/DynamicForm/types';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';
import type {Choice} from '@components/RadioButtons';

import {isValidSSNFullNine} from '@libs/ValidationUtils';

import type AddressFormFields from '@pages/ReimbursementAccount/AddressFormFields';

import CONST from '@src/CONST';
import type {Country} from '@src/CONST';
import type {
    DynamicFormChoiceField,
    DynamicFormCountryField,
    DynamicFormField,
    DynamicFormFieldOption,
    DynamicFormFieldType,
    DynamicFormMultiChoiceField,
    DynamicFormSchemaField,
} from '@src/types/onyx';

import type {ComponentProps} from 'react';

type AddressInputKeys = ComponentProps<typeof AddressFormFields>['inputKeys'];

type DynamicFormOptionField = DynamicFormChoiceField | DynamicFormMultiChoiceField | DynamicFormCountryField;

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

const MASK_VISIBLE_CHARACTERS = 4;

function isCountryCode(code: string): code is Country {
    return code in CONST.ALL_COUNTRIES;
}

const COUNTRY_OPTIONS: DynamicFormFieldOption[] = Object.keys(CONST.ALL_COUNTRIES)
    .filter(isCountryCode)
    .map((code) => ({key: code, labelKey: `allCountries.${code}`}));

/** Whether this App version knows the field type. An unknown one is reported once. */
function isSupportedFieldType(type: string, key: string | undefined): boolean {
    if (Object.hasOwn(SUPPORTED_FIELD_TYPES, type)) {
        return true;
    }
    logSchemaProblem('Unknown field type', {type, key: key ?? ''});
    return false;
}

/** A field of a type this App version does not know, or with no key to store its answer under, is left out, so it neither renders nor blocks submission */
function isSupportedField(field: DynamicFormSchemaField): field is DynamicFormField {
    if (!field.key) {
        logSchemaProblem('Field without a key', {type: field.type});
        return false;
    }
    return isSupportedFieldType(field.type, field.key);
}

function getFieldLabel(field: DynamicFormField, translate: LocalizedTranslate): string {
    return getLocalizedText(translate, field.labelKey, field.label) ?? field.key;
}

/**
 * Draft keys for AddressFormFields. The street is the field's own value, and an empty key tells AddressSearch to drop that part, such as the place `name`.
 * Without a `street2` key AddressSearch adds the apartment number to the street, and also writes it to a top-level `street2` draft key that no field submits.
 */
function getAddressInputKeys(fieldKey: string): Required<Pick<AddressInputKeys, 'street' | 'city' | 'state' | 'zipCode' | 'country' | 'lat' | 'lng' | 'address'>> & {name: string} {
    return {
        street: fieldKey,
        city: `${fieldKey}.city`,
        state: `${fieldKey}.state`,
        zipCode: `${fieldKey}.zipCode`,
        country: `${fieldKey}.country`,
        lat: '',
        lng: '',
        address: '',
        name: '',
    };
}

/** The picked country, or '' while none or an unknown one is picked */
function getAddressCountry(fieldKey: string, values: DynamicFormValues): Country | '' {
    const country = values[getAddressInputKeys(fieldKey).country];
    return typeof country === 'string' && isCountryCode(country) ? country : '';
}

/** AddressFormFields lists US states, or Canadian provinces, and assumes the US until a country is picked */
function isStateAsked(country: Country | ''): boolean {
    return !country || country === CONST.COUNTRY.US || country === CONST.COUNTRY.CA;
}

/** The draft keys a field writes to: its own, plus its address parts or its chosen currency */
function getAnswerKeys(field: DynamicFormField): string[] {
    switch (field.type) {
        case 'address':
            return Object.values(getAddressInputKeys(field.key)).filter(Boolean);
        case 'amount':
            return field.currencyKey ? [field.key, field.currencyKey] : [field.key];
        default:
            return [field.key];
    }
}

/** The field is sensitive, or is a list whose entries hold a sensitive answer at any depth, so its answer must stay out of the draft */
function hasSensitiveAnswer(field: DynamicFormField): boolean {
    return !!field.sensitive || (field.type === 'list' && field.itemFields.some(hasSensitiveAnswer));
}

function getListedOptions(field: DynamicFormChoiceField | DynamicFormMultiChoiceField, values: DynamicFormValues): DynamicFormFieldOption[] {
    if (!field.dependsOn) {
        return field.values ?? [];
    }
    const controllingValue = values[field.dependsOn.key];
    if (typeof controllingValue !== 'string' && typeof controllingValue !== 'boolean') {
        return [];
    }
    return field.dependsOn.valuesBy[String(controllingValue)] ?? [];
}

/** The options a choice field offers right now, picked by the answer it depends on */
function getFieldOptions(field: DynamicFormOptionField, values: DynamicFormValues): DynamicFormFieldOption[] {
    switch (field.type) {
        case 'country':
        case 'countryMultiselect':
            return COUNTRY_OPTIONS;
        default:
            return getListedOptions(field, values);
    }
}

function getOptionLabel(option: DynamicFormFieldOption, translate: LocalizedTranslate): string {
    return getLocalizedText(translate, option.labelKey, option.label) ?? option.key;
}

function getFieldChoices(field: DynamicFormOptionField, values: DynamicFormValues, translate: LocalizedTranslate): Choice[] {
    return getFieldOptions(field, values).map((option) => ({
        value: option.key,
        label: getOptionLabel(option, translate),
    }));
}

/** Street, then city, then state and zip, then country, as in "1 Main Street, Springfield, IL 62701, United States" */
function formatAddress(fieldKey: string, values: DynamicFormValues, translate: LocalizedTranslate): string {
    const addressKeys = getAddressInputKeys(fieldKey);
    const getPart = (partKey: string) => {
        const part = values[partKey];
        return typeof part === 'string' ? part : '';
    };
    const stateAndZip = [getPart(addressKeys.state), getPart(addressKeys.zipCode)].filter(Boolean).join(' ');
    const country = getAddressCountry(fieldKey, values);
    const countryName = country ? translate(`allCountries.${country}`) : '';
    return [getPart(addressKeys.street), getPart(addressKeys.city), stateAndZip, countryName].filter(Boolean).join(', ');
}

/** An answer as the user reads it, for rows that show a value instead of an input */
function formatDynamicFieldValue(field: DynamicFormField, values: DynamicFormValues, translate: LocalizedTranslate): string {
    const answer = values[field.key];
    if (typeof answer === 'boolean') {
        return translate(answer ? 'common.yes' : 'common.no');
    }
    if (Array.isArray(answer)) {
        const items: unknown[] = answer;
        if (field.type === 'file') {
            return translate('dynamicForm.fileCount', {count: items.length});
        }
        if (field.type !== 'multiselect' && field.type !== 'countryMultiselect') {
            return '';
        }
        const options = getFieldOptions(field, values);
        return items
            .flatMap((key) => options.filter((option) => option.key === key))
            .map((option) => getOptionLabel(option, translate))
            .join(', ');
    }
    if (typeof answer !== 'string') {
        return '';
    }
    switch (field.type) {
        case 'select':
        case 'radio': {
            const option = getFieldOptions(field, values).find((candidate) => candidate.key === answer);
            return option ? getOptionLabel(option, translate) : answer;
        }
        case 'country':
            return isCountryCode(answer) ? translate(`allCountries.${answer}`) : answer;
        case 'percent':
            return `${answer}%`;
        case 'address':
            return formatAddress(field.key, values, translate);
        default:
            return answer;
    }
}

/** All but the last four characters hidden, as in •••-••-6789, so the user can tell which number they entered. A short value shows at most half of itself. */
function maskSensitiveValue(value: string): string {
    const visibleCharacters = Math.min(MASK_VISIBLE_CHARACTERS, Math.floor(value.length / 2));
    const masked = '•'.repeat(value.length - visibleCharacters) + value.slice(value.length - visibleCharacters);
    return isValidSSNFullNine(value) ? `${masked.slice(0, 3)}-${masked.slice(3, 5)}-${masked.slice(5)}` : masked;
}

export {
    formatDynamicFieldValue,
    getAddressCountry,
    getAddressInputKeys,
    getAnswerKeys,
    getFieldChoices,
    getFieldLabel,
    getFieldOptions,
    hasSensitiveAnswer,
    isStateAsked,
    isSupportedField,
    isSupportedFieldType,
    maskSensitiveValue,
};
