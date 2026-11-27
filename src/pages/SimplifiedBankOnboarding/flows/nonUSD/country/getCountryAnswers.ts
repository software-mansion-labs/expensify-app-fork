/** The country of the NonUSD bank account: the draft value, then the saved one (BC-08). An AUD account is always Australian. */
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import type {FlowData} from '@pages/SimplifiedBankOnboarding/core';

function getCountryAnswers({draft, account, currency}: FlowData): {country: string} {
    return {country: currency === SBO_CONST.CURRENCY.AUD ? SBO_CONST.COUNTRY.AU : (draft.country ?? account?.achData?.country ?? '')};
}

export default getCountryAnswers;
