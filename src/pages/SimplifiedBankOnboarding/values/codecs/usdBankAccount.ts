/**
 * The inputs of the USD bank step. The server returns only the masked account number, so after a save the step shows the
 * masked number of the server, and the manual form accepts it as a valid value.
 */
import type {DraftFields} from '@pages/SimplifiedBankOnboarding/requests/buildTrackedRequestData';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import type {ResolvedValues} from '@pages/SimplifiedBankOnboarding/values/resolveValue';

const MANUAL_KEYS = {
    ROUTING_NUMBER: INPUT_IDS.ROUTING_NUMBER,
    ACCOUNT_NUMBER: INPUT_IDS.ACCOUNT_NUMBER,
};

type ManualValues = ResolvedValues<(typeof MANUAL_KEYS)[keyof typeof MANUAL_KEYS]>;

/** Both variants clear every bank input, because the account that one of them connected replaces the other one */
const FIELDS_TO_CLEAR: DraftFields = [INPUT_IDS.ROUTING_NUMBER, INPUT_IDS.ACCOUNT_NUMBER, INPUT_IDS.BANK_NAME, INPUT_IDS.PLAID_ACCOUNT_ID];

function toManualParams(values: Partial<ManualValues>): ManualValues {
    return {routingNumber: values.routingNumber?.trim() ?? '', accountNumber: values.accountNumber?.trim() ?? ''};
}

export {FIELDS_TO_CLEAR, MANUAL_KEYS, toManualParams};
export type {ManualValues};
