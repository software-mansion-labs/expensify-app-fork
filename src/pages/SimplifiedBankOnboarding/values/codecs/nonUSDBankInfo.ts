/**
 * The inputs of the NonUSD bank step. The server decides which bank inputs a country needs, and the request that
 * creates the account also saves the country that the previous page kept in the draft.
 */
import type {DraftFields} from '@pages/SimplifiedBankOnboarding/requests/buildTrackedRequestData';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import type {BankFieldID} from '@pages/SimplifiedBankOnboarding/types/onyx';

function getFieldsToClear(inputKeys: Record<string, BankFieldID>): DraftFields {
    return [...Object.values(inputKeys), INPUT_IDS.COUNTRY];
}

// eslint-disable-next-line import/prefer-default-export -- Every codec exports named functions, so the steps import them the same way.
export {getFieldsToClear};
