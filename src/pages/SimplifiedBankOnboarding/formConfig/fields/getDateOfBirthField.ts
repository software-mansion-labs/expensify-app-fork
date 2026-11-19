import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {DateFieldConfig, TextInputID} from '@pages/SimplifiedBankOnboarding/formConfig/types';

/** The date of birth of a person, who must be old enough to make payments */
function getDateOfBirthField(inputID: TextInputID, defaultValue: string, translate: LocalizedTranslate): DateFieldConfig {
    return {
        type: 'date',
        id: inputID,
        label: translate('common.dob'),
        defaultValue,
        isRequired: true,
        isDateOfBirth: true,
    };
}

export default getDateOfBirthField;
