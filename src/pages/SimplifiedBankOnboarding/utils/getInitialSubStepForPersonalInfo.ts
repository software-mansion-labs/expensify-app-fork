/**
 * Returns the index of the first sub page of the personal info step that still misses data, so a returning user lands there.
 */
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {PersonalInfoValues} from '@pages/SimplifiedBankOnboarding/values/codecs/usdPersonalInfo';

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
