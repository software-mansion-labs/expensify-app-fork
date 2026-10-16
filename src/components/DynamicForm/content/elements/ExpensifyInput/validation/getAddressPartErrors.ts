import getAddressInputKeys, {getAddressCountry, isStateAsked} from '@components/DynamicForm/content/elements/ExpensifyInput/model/getAddressInputKeys';
import isAnswered from '@components/DynamicForm/shared/isAnswered';
import type {DynamicFormError, DynamicFormValues} from '@components/DynamicForm/types';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import {getCountryZipRegexDetails, isValidZipCodeForCountry} from '@libs/ValidationUtils';

import type {DynamicFormAddressField} from '@src/types/onyx';

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

export default getAddressPartErrors;
export {isAddressRequired};
