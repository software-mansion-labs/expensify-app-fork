import {shouldRestrictUserBillableActions} from '@libs/SubscriptionUtils';

import ONYXKEYS from '@src/ONYXKEYS';
import type {Policy} from '@src/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

import useCurrentUserPersonalDetails from './useCurrentUserPersonalDetails';
import useOnyx from './useOnyx';
import usePolicyOwnerBillingGraceEndPeriod from './usePolicyOwnerBillingGraceEndPeriod';

/**
 * Resolves the policy ID to redirect to `RESTRICTED_ACTION` when the given policy's billable actions
 * are restricted (e.g. expired/owing workspace), or `undefined` when the action is allowed.
 *
 * Centralizes the billing-grace / amount-owed Onyx reads + the `shouldRestrictUserBillableActions`
 * check so callers (e.g. the split entry points) don't each duplicate them.
 */
function useRestrictedActionPolicyID(policy: OnyxEntry<Policy>): string | undefined {
    const {accountID} = useCurrentUserPersonalDetails();
    const [ownerBillingGracePeriodEnd] = useOnyx(ONYXKEYS.NVP_PRIVATE_OWNER_BILLING_GRACE_PERIOD_END);
    const [policyOwnerBillingGraceEndPeriod] = usePolicyOwnerBillingGraceEndPeriod(policy);
    const [amountOwed] = useOnyx(ONYXKEYS.NVP_PRIVATE_AMOUNT_OWED);

    if (!policy || !shouldRestrictUserBillableActions(policy, ownerBillingGracePeriodEnd, policyOwnerBillingGraceEndPeriod, amountOwed, accountID)) {
        return undefined;
    }
    return policy.id;
}

export default useRestrictedActionPolicyID;
