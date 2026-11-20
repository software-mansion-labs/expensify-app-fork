/**
 * The inputs of the USD business step. The form accepts a tax ID with separators, and the request sends the digits only.
 */
import type {DraftFields} from '@pages/SimplifiedBankOnboarding/requests/buildTrackedRequestData';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import type {ResolvedValues} from '@pages/SimplifiedBankOnboarding/values/resolveValue';

import CONST from '@src/CONST';

const BUSINESS_INFO_KEYS = {
    COMPANY_NAME: INPUT_IDS.COMPANY_NAME,
    COMPANY_TAX_ID: INPUT_IDS.COMPANY_TAX_ID,
    INCORPORATION_TYPE: INPUT_IDS.INCORPORATION_TYPE,
};

type BusinessInfoValues = ResolvedValues<(typeof BUSINESS_INFO_KEYS)[keyof typeof BUSINESS_INFO_KEYS]>;

const FIELDS_TO_CLEAR: DraftFields = Object.values(BUSINESS_INFO_KEYS);

function toParams(values: BusinessInfoValues): BusinessInfoValues {
    return {...values, companyTaxID: values.companyTaxID.replaceAll(CONST.REGEX.NON_NUMERIC, '')};
}

export {BUSINESS_INFO_KEYS, FIELDS_TO_CLEAR, toParams};
export type {BusinessInfoValues};
