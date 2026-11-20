import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {PageInputs} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/types/form';

import getInputError from './getInputError';
import getInputIDs from './getInputIDs';

/** The answers already pass the rules of every input of a page, so the flow can resume after it */
function areInputsComplete(inputs: PageInputs, answers: OnboardingDraft, translate: LocalizedTranslate): boolean {
    return getInputIDs(inputs).every((inputID) => !getInputError(inputs, inputID, answers, translate));
}

export default areInputsComplete;
