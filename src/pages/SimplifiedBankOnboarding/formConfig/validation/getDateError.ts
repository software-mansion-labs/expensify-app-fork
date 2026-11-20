import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import {isValidPastDate, meetsMaximumAgeRequirement, meetsMinimumAgeRequirement} from '@libs/ValidationUtils';

import type {DateFieldConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';

/** Checks that a date lies in the past and, for a date of birth, gives an age the payment rules accept */
function getDateError(field: DateFieldConfig, value: string, translate: LocalizedTranslate): string | undefined {
    if (!isValidPastDate(value)) {
        return translate('bankAccount.error.dob');
    }
    if (!field.isDateOfBirth) {
        return undefined;
    }
    if (!meetsMaximumAgeRequirement(value)) {
        return translate('bankAccount.error.dob');
    }
    if (!meetsMinimumAgeRequirement(value)) {
        return translate('bankAccount.error.age');
    }
    return undefined;
}

export default getDateError;
