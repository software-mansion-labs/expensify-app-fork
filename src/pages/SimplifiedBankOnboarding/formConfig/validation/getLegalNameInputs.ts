import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {PageInputs} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import type {TextInputID} from '@pages/SimplifiedBankOnboarding/types/form';

import getLegalNameError from './getLegalNameError';

/** The rules of the first and last name inputs that `LegalNameFields` renders */
function getLegalNameInputs(firstNameID: TextInputID, lastNameID: TextInputID, translate: LocalizedTranslate): PageInputs {
    const validate = (value: string) => getLegalNameError(value, translate);
    const inputs: PageInputs = {};
    inputs[firstNameID] = {validate};
    inputs[lastNameID] = {validate};
    return inputs;
}

export default getLegalNameInputs;
