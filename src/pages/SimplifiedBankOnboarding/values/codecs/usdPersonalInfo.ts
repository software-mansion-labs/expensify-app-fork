/**
 * The inputs of the USD personal info step. The server stores them under the same names, so the form reads them with
 * the resolver and sends them as they are.
 */
import type {DraftFields} from '@pages/SimplifiedBankOnboarding/requests/buildTrackedRequestData';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import type {ResolvedValues} from '@pages/SimplifiedBankOnboarding/values/resolveValue';

const PERSONAL_INFO_KEYS = {
    FIRST_NAME: INPUT_IDS.FIRST_NAME,
    LAST_NAME: INPUT_IDS.LAST_NAME,
    DOB: INPUT_IDS.DOB,
    SSN_LAST_4: INPUT_IDS.SSN_LAST_4,
};

type PersonalInfoValues = ResolvedValues<(typeof PERSONAL_INFO_KEYS)[keyof typeof PERSONAL_INFO_KEYS]>;

const FIELDS_TO_CLEAR: DraftFields = Object.values(PERSONAL_INFO_KEYS);

export {FIELDS_TO_CLEAR, PERSONAL_INFO_KEYS};
export type {PersonalInfoValues};
