import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {TextFieldConfig, TextInputID} from '@pages/SimplifiedBankOnboarding/formConfig/types';

import getLegalNameError from './getLegalNameError';

type LegalName = {
    firstName: string;
    lastName: string;
};

type LegalNameInputIDs = {
    firstName: TextInputID;
    lastName: TextInputID;
};

/** The first and last name inputs of a person, such as the user or a beneficial owner */
function getLegalNameFields(inputIDs: LegalNameInputIDs, defaultValues: LegalName, translate: LocalizedTranslate): TextFieldConfig[] {
    const validate = (value: string) => getLegalNameError(value, translate);
    return [
        {type: 'text', id: inputIDs.firstName, label: translate('personalInfoStep.legalFirstName'), defaultValue: defaultValues.firstName, isRequired: true, validate},
        {type: 'text', id: inputIDs.lastName, label: translate('personalInfoStep.legalLastName'), defaultValue: defaultValues.lastName, isRequired: true, validate},
    ];
}

export default getLegalNameFields;
