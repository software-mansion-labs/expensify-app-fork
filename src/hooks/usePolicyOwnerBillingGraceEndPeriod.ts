import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {BillingGraceEndPeriod, OnyxInputOrEntry, Policy} from '@src/types/onyx';

import type {OnyxEntry, ResultMetadata} from 'react-native-onyx';

import useOnyx from './useOnyx';

/**
 * Subscribes to the billing grace period end NVP of the given policy's owner — the only member of the
 * SHARED_NVP_PRIVATE_USER_BILLING_GRACE_PERIOD_END collection that `shouldRestrictUserBillableActions` needs,
 * so we don't hydrate the whole collection.
 *
 * When the policy has no owner account ID there is no member to read: we subscribe to a placeholder key
 * (`DEFAULT_NUMBER_ID`, which is never a real account ID — never an `..._undefined` key) and return `undefined`.
 */
function usePolicyOwnerBillingGraceEndPeriod(policy: OnyxInputOrEntry<Policy> | null): [OnyxEntry<BillingGraceEndPeriod>, ResultMetadata] {
    const ownerAccountID = policy?.ownerAccountID;
    // eslint-disable-next-line rulesdir/no-default-id-values -- DEFAULT_NUMBER_ID is a deliberate match-nothing probe (hooks can't be conditional); the return below hides its value
    const [policyOwnerBillingGraceEndPeriod, metadata] = useOnyx(`${ONYXKEYS.COLLECTION.SHARED_NVP_PRIVATE_USER_BILLING_GRACE_PERIOD_END}${ownerAccountID ?? CONST.DEFAULT_NUMBER_ID}`);
    return [ownerAccountID ? policyOwnerBillingGraceEndPeriod : undefined, metadata];
}

export default usePolicyOwnerBillingGraceEndPeriod;
