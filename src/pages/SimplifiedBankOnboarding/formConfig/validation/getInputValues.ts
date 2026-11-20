import type {PageInputs} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import type {InputID, OnboardingDraft} from '@pages/SimplifiedBankOnboarding/types/form';

import getInputIDs from './getInputIDs';

/** The form holds the whole draft, so a page submits only the values of its own inputs */
function getInputValues(inputs: PageInputs, values: OnboardingDraft): OnboardingDraft {
    const inputValues: OnboardingDraft = {};

    // A generic key keeps the value type of the input, which a union of input IDs would lose
    const copyValue = <TID extends InputID>(inputID: TID) => {
        inputValues[inputID] = values[inputID];
    };

    for (const inputID of getInputIDs(inputs)) {
        copyValue(inputID);
    }
    return inputValues;
}

export default getInputValues;
