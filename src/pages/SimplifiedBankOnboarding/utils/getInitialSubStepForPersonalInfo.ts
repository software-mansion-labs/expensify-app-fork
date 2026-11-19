/**
 * Returns the index of the first sub page of the personal info step that still misses data, so a returning user lands there.
 */
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

import type {SubStepValues} from './getSubStepValues';

type PersonalInfoValues = SubStepValues<typeof INPUT_IDS.FIRST_NAME | typeof INPUT_IDS.LAST_NAME | typeof INPUT_IDS.DOB | typeof INPUT_IDS.SSN_LAST_4>;

const {LEGAL_NAME, DATE_OF_BIRTH, SSN} = SBO_CONST.USD.SUBSTEP_INDEX.PERSONAL_INFO;
const CONFIRMATION_INDEX = SSN + 1;

function getInitialSubStepForPersonalInfo(values: PersonalInfoValues): number {
    if (values.firstName === '' || values.lastName === '') {
        return LEGAL_NAME;
    }
    if (values.dob === '') {
        return DATE_OF_BIRTH;
    }
    if (values.ssnLast4 === '') {
        return SSN;
    }
    return CONFIRMATION_INDEX;
}

export default getInitialSubStepForPersonalInfo;
