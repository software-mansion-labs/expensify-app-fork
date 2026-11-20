import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import {isValidPastDate, meetsMaximumAgeRequirement, meetsMinimumAgeRequirement} from '@libs/ValidationUtils';

/** A date of birth lies in the past and gives an age that the payment rules accept */
function getDateOfBirthError(value: string, translate: LocalizedTranslate): string | undefined {
    if (!isValidPastDate(value) || !meetsMaximumAgeRequirement(value)) {
        return translate('bankAccount.error.dob');
    }
    if (!meetsMinimumAgeRequirement(value)) {
        return translate('bankAccount.error.age');
    }
    return undefined;
}

export default getDateOfBirthError;
