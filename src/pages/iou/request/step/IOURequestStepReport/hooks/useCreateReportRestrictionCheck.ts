import useOnyx from '@hooks/useOnyx';
import usePolicyOwnerBillingGraceEndPeriod from '@hooks/usePolicyOwnerBillingGraceEndPeriod';

import {shouldRestrictUserBillableActions} from '@libs/SubscriptionUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Policy, Session} from '@src/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

/**
 * @param session — current user session; provides the accountID used by `shouldRestrictUserBillableActions`.
 * @param restrictionPolicy — the candidate restriction policy; its owner's billing grace period entry is subscribed to here.
 * @returns a check function: returns true when create-report should be blocked for the given restriction policy.
 */
function useCreateReportRestrictionCheck(session: OnyxEntry<Session>, restrictionPolicy: OnyxEntry<Policy>): () => boolean {
    const [restrictionPolicyOwnerBillingGraceEndPeriod] = usePolicyOwnerBillingGraceEndPeriod(restrictionPolicy);
    const [ownerBillingGracePeriodEnd] = useOnyx(ONYXKEYS.NVP_PRIVATE_OWNER_BILLING_GRACE_PERIOD_END);
    const [amountOwed] = useOnyx(ONYXKEYS.NVP_PRIVATE_AMOUNT_OWED);

    return () => {
        if (!restrictionPolicy) {
            return false;
        }
        return shouldRestrictUserBillableActions(
            restrictionPolicy,
            ownerBillingGracePeriodEnd,
            restrictionPolicyOwnerBillingGraceEndPeriod,
            amountOwed,
            session?.accountID ?? CONST.DEFAULT_NUMBER_ID,
        );
    };
}

export default useCreateReportRestrictionCheck;
