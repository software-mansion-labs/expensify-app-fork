import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import {isValidPastDate} from '@libs/ValidationUtils';

import type {DateFieldConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';

import {isAfter, isBefore, isSameDay, subYears} from 'date-fns';

/** Checks that a date lies in the past and gives an age within the bounds of the field */
function getDateError(field: DateFieldConfig, value: string, translate: LocalizedTranslate): string | undefined {
    if (!isValidPastDate(value)) {
        return translate('bankAccount.error.dob');
    }
    const date = new Date(value);
    const today = new Date();
    if (field.maxAge !== undefined) {
        const oldestDate = subYears(today, field.maxAge);
        if (!isSameDay(date, oldestDate) && isBefore(date, oldestDate)) {
            return translate('bankAccount.error.dob');
        }
    }
    if (field.minAge !== undefined) {
        const youngestDate = subYears(today, field.minAge);
        if (!isSameDay(date, youngestDate) && isAfter(date, youngestDate)) {
            return translate('bankAccount.error.age');
        }
    }
    return undefined;
}

export default getDateError;
