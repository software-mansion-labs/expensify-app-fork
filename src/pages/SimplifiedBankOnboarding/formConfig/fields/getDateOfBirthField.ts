import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {DateFieldConfig, TextInputID} from '@pages/SimplifiedBankOnboarding/formConfig/types';

import CONST from '@src/CONST';

/** The date of birth of a person, who must be old enough to make payments */
function getDateOfBirthField(inputID: TextInputID, defaultValue: string, translate: LocalizedTranslate): DateFieldConfig {
    return {
        type: 'date',
        id: inputID,
        label: translate('common.dob'),
        defaultValue,
        isRequired: true,
        minAge: CONST.DATE_BIRTH.MIN_AGE_FOR_PAYMENT,
        maxAge: CONST.DATE_BIRTH.MAX_AGE,
    };
}

export default getDateOfBirthField;
