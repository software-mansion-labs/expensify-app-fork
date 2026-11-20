import type {PageInputs} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import type {InputID} from '@pages/SimplifiedBankOnboarding/types/form';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

const INPUT_ID_SET = new Set<string>(Object.values(INPUT_IDS));

function isInputID(key: string): key is InputID {
    return INPUT_ID_SET.has(key);
}

/** The inputs that a form page lists, in the order of its rules */
function getInputIDs(inputs: PageInputs): InputID[] {
    return Object.keys(inputs).filter(isInputID);
}

export default getInputIDs;
