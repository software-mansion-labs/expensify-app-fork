/**
 * The inputs of the NonUSD business step. The server stores them under the same names in `achData.corpay`.
 */
import type {DraftFields} from '@pages/SimplifiedBankOnboarding/requests/buildTrackedRequestData';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import type {ResolvedValues} from '@pages/SimplifiedBankOnboarding/values/resolveValue';

const BUSINESS_INFO_KEYS = {
    COMPANY_NAME: INPUT_IDS.COMPANY_NAME,
    BUSINESS_TYPE: INPUT_IDS.BUSINESS_TYPE,
};

type BusinessInfoValues = ResolvedValues<(typeof BUSINESS_INFO_KEYS)[keyof typeof BUSINESS_INFO_KEYS]>;

const FIELDS_TO_CLEAR: DraftFields = Object.values(BUSINESS_INFO_KEYS);

export {BUSINESS_INFO_KEYS, FIELDS_TO_CLEAR};
export type {BusinessInfoValues};
